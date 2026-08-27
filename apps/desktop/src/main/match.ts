import { randomUUID } from "node:crypto";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  ClubNotFoundError,
  ClubSummary,
  CommentaryLineView,
  InjuryView,
  MatchNotFoundError,
  MatchSummary,
  ResumeSimulationView,
  SubstitutionStatusView,
  Tactic,
  type ChangeTacticsCommandPayload,
  type MakeSubstitutionCommandPayload,
} from "@cm-clone/contracts";
import {
  MAX_SUBSTITUTIONS_PER_TEAM,
  MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  simulateMatchWithCondition,
  type MatchCommand,
  type MatchEvent,
  type MatchTeamSetup,
} from "@cm-clone/game-engine";
import {
  FORMATION_SLOTS,
  POSITION_ROLES,
  renderCommentary,
  type CommentaryNameResolver,
  type PlayerAttributes,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import {
  appendStreamEvents,
  loadStreamEvents,
  nextStreamSeq,
  withExistingSave,
  type StreamEvent,
} from "./decider.js";
import { assertSaveNotSacked } from "./managerStatus.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { loadPersistedTactic } from "./tactics.js";

/** The Match Decider's stream type (ADR-0007) — `streamId` is a fresh matchId per started match. */
const MATCH_STREAM_TYPE = "match";

/** Chunk size cap for a single `ResumeSimulation` response when no boundary event is hit first
 * (ADR-0007: chunked resimulation, no RPC streaming) — the renderer paces reveal client-side. */
const MAX_CHUNK_SIZE = 40;

/** `simulateMatch`'s half length (`packages/game-engine/src/match/simulate.ts`) — halftime
 * commands and any live command targeting exactly this minute both surface as a `Substitution`/
 * tactics-adjacent event at `minute: 45`, so `computeSubstitutionStatus` below treats minute 45 as
 * the halftime window (never counted against the 3-window cap) rather than trying to disambiguate
 * the rare case of a live command also landing on minute 45 — a deliberate, documented UI-display
 * approximation; the engine's own cap enforcement (`packages/game-engine/src/match/simulate.ts`)
 * remains authoritative and unaffected by this. */
const HALFTIME_MINUTE = 45;

const BOUNDARY_TAGS: ReadonlySet<MatchEvent["_tag"]> = new Set(["HalfTimeReached", "FullTimeWhistle"]);

/**
 * A basic 4-4-2 with one player per required Position/Role, drawn from the club's generated squad
 * (naturally-fit players preferred, any unused player otherwise). Stopgap ahead of ticket 17 (AI
 * tactics automation) for clubs the player hasn't set a Tactic for via `ChangeTactics` — every
 * generated squad has enough players per Position (`SQUAD_COMPOSITION` in `@cm-clone/shared`) to
 * fill it.
 */
const synthesizeDefaultTactic = (
  squad: ReadonlyArray<{
    readonly id: string;
    readonly positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>;
  }>,
): Tactic => {
  const usedIds = new Set<string>();
  const slots = FORMATION_SLOTS["4-4-2"].map((position) => {
    const naturalFit = squad.find(
      (player) =>
        !usedIds.has(player.id) &&
        player.positions.some((p) => p.position === position && p.familiarity !== "unfamiliar"),
    );
    const anyAvailable = squad.find((player) => !usedIds.has(player.id));
    const chosen = naturalFit ?? anyAvailable ?? squad[0]!;
    usedIds.add(chosen.id);
    return { position, role: POSITION_ROLES[position], playerId: chosen.id };
  });

  return new Tactic({ formation: "4-4-2", slots, mentality: "balanced", tempo: "normal", pressing: "medium" });
};

/** Builds a `MatchTeamSetup` for any club: its persisted Tactic if `ChangeTactics` was ever issued
 * for it, else the synthesized default above. Assumes a `SqlClient` in context. */
const loadTeamSetup = (clubId: string) =>
  Effect.gen(function* () {
    const squad = yield* loadSquadPlayers(clubId);
    const persisted = yield* loadPersistedTactic(clubId);
    const tactic = persisted ?? synthesizeDefaultTactic(squad);
    const setup: MatchTeamSetup = {
      clubId,
      squad: squad.map((player) => ({ id: player.id, attributes: player.attributes as PlayerAttributes })),
      tactic,
    };
    return setup;
  });

const loadClubSummary = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      id: string;
      name: string;
      statureTier: "big" | "mid" | "small";
    }>`SELECT id, name, stature_tier as "statureTier" FROM clubs WHERE id = ${clubId}`;
    if (rows.length === 0) return null;
    return yield* Schema.decodeUnknownEffect(ClubSummary)(rows[0]);
  });

/** Every club but the user's own — the "pick-an-opponent" stopgap this ticket uses in place of a
 * fixture list (ticket 15, in parallel, will supersede this with real fixtures). */
export const listOpponentClubs = (savesDir: string, saveId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const rows = yield* sql<{
        id: string;
        name: string;
        statureTier: "big" | "mid" | "small";
      }>`SELECT id, name, stature_tier as "statureTier" FROM clubs WHERE id != ${club.id} ORDER BY name`;
      return yield* Effect.forEach(rows, (row) => Schema.decodeUnknownEffect(ClubSummary)(row));
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/** The decider-level `MatchStarted` stream event payload (seq 1 of every "match" stream) — the
 * seed plus a frozen kickoff snapshot of both teams' squad + starting Tactic. Snapshotting the
 * setups here (rather than re-reading `tactics`/`players` tables on every resimulation) is what
 * keeps resimulation pure and prefix-stable: an unrelated `ChangeTactics` saved from the Tactics
 * screen mid-match must not retroactively rewrite the kickoff tactic this match already resolved
 * minutes of play against. */
interface PersistedMatchStarted {
  readonly seed: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeSetup: MatchTeamSetup;
  readonly awaySetup: MatchTeamSetup;
}

/** Ticket 14 mid-match command journal entries — one per accepted `SubmitMatchCommand` call,
 * appended after seq 1. `minute`/`isHalftime` mirror `simulateMatch`'s `commandsByMinute` /
 * `halftimeCommands` split. */
interface PersistedTacticsChanged {
  readonly _tag: "TacticsChanged";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: string;
  readonly tactic: Tactic;
}

interface PersistedSubstitutionMade {
  readonly _tag: "SubstitutionMade";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: string;
  readonly outPlayerId: string;
  readonly inPlayerId: string;
}

/**
 * `StartMatch` (ticket 13, extended by ticket 14): persists only the seed + kickoff team setups —
 * never the resulting `MatchEvent` timeline. `resumeSimulation`/`submitMatchCommand` resimulate
 * from this plus the mid-match command journal on every call (`deriveMatchEvents` below):
 * `simulateMatch` is pure and sub-millisecond (ADR-0007), so recomputing beats persisting a
 * timeline that a later `SubmitMatchCommand` would have to invalidate and recompute anyway.
 */
export const startMatch = (savesDir: string, saveId: string, opponentClubId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotSacked(saveId);
      const userClub = yield* loadUserClub;
      const opponentClub = yield* loadClubSummary(opponentClubId);
      if (!opponentClub) return yield* new ClubNotFoundError({ id: opponentClubId });
      if (opponentClub.id === userClub.id) return yield* new ClubNotFoundError({ id: opponentClubId });

      const homeSetup = yield* loadTeamSetup(userClub.id);
      const awaySetup = yield* loadTeamSetup(opponentClub.id);

      const matchId = randomUUID();
      // Deterministic per match (ADR-0002) — Date.now() picks a fresh seed per `StartMatch` call,
      // matchId keeps every call's seed distinct even within the same millisecond.
      const seed = (Date.now() ^ hashString(matchId)) >>> 0;

      const started: PersistedMatchStarted = {
        seed,
        homeClubId: userClub.id,
        awayClubId: opponentClub.id,
        homeSetup,
        awaySetup,
      };

      const startSeq = yield* nextStreamSeq(MATCH_STREAM_TYPE, matchId);
      yield* appendStreamEvents(MATCH_STREAM_TYPE, matchId, startSeq, [{ tag: "MatchStarted", payload: started }]);

      return new MatchSummary({
        matchId,
        homeClubId: userClub.id,
        homeClubName: userClub.name,
        awayClubId: opponentClub.id,
        awayClubName: opponentClub.name,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

const hashString = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const collectPlayerIds = (event: MatchEvent): ReadonlyArray<string> => {
  switch (event._tag) {
    case "MatchStarted":
      return [];
    case "Substitution":
      return [event.outPlayerId, event.inPlayerId];
    case "HalfTimeReached":
    case "FullTimeWhistle":
      return [];
    default:
      return [event.playerId];
  }
};

const scoreAsOf = (events: ReadonlyArray<MatchEvent>): { readonly homeScore: number; readonly awayScore: number } => {
  let homeScore = 0;
  let awayScore = 0;
  for (const event of events) {
    if (event._tag === "Goal" || event._tag === "HalfTimeReached" || event._tag === "FullTimeWhistle") {
      homeScore = event.homeScore;
      awayScore = event.awayScore;
    }
  }
  return { homeScore, awayScore };
};

/**
 * Rebuilds the full `MatchEvent` timeline from a raw "match" stream: seq 1 is always the
 * `PersistedMatchStarted` snapshot, every later row is a ticket 14 `TacticsChanged`/
 * `SubstitutionMade` command journal entry. Pure function of the stream's contents — same stream
 * in, same timeline out, which is what makes `resumeSimulation`'s cursor-based chunking and the
 * determinism test both work. Also returns each player's full-time Condition (ticket 02).
 */
const deriveMatchEvents = (stream: ReadonlyArray<StreamEvent>): {
  readonly events: ReadonlyArray<MatchEvent>;
  readonly conditions: ReadonlyMap<string, number>;
} => {
  const started = stream[0]!.payload as PersistedMatchStarted;

  const commandsByMinute = new Map<number, Array<MatchCommand>>();
  const halftimeCommands: Array<MatchCommand> = [];

  const schedule = (command: MatchCommand, minute: number, isHalftime: boolean): void => {
    if (isHalftime) {
      halftimeCommands.push(command);
      return;
    }
    const existing = commandsByMinute.get(minute);
    if (existing) existing.push(command);
    else commandsByMinute.set(minute, [command]);
  };

  for (const row of stream.slice(1)) {
    if (row.tag === "TacticsChanged") {
      const p = row.payload as PersistedTacticsChanged;
      schedule({ _tag: "ChangeTactics", clubId: p.clubId, tactic: p.tactic }, p.minute, p.isHalftime);
    } else if (row.tag === "SubstitutionMade") {
      const p = row.payload as PersistedSubstitutionMade;
      schedule(
        { _tag: "MakeSubstitution", clubId: p.clubId, outPlayerId: p.outPlayerId, inPlayerId: p.inPlayerId },
        p.minute,
        p.isHalftime,
      );
    }
  }

  return simulateMatchWithCondition({
    seed: started.seed,
    home: started.homeSetup,
    away: started.awaySetup,
    commandsByMinute,
    halftimeCommands,
  });
};

/** Per-club substitution cap status (ticket 14) computed straight from the derived `MatchEvent`
 * timeline's accepted `Substitution` events — authoritative for "used" (the engine only ever emits
 * a `Substitution` event when it actually accepted the command), an approximation for "windows
 * used" (see `HALFTIME_MINUTE`'s doc comment above). */
const computeSubstitutionStatus = (clubId: string, events: ReadonlyArray<MatchEvent>): SubstitutionStatusView => {
  const subs = events.filter(
    (event): event is Extract<MatchEvent, { readonly _tag: "Substitution" }> =>
      event._tag === "Substitution" && event.teamClubId === clubId,
  );
  const used = subs.length;
  const windowsUsed = new Set(subs.filter((sub) => sub.minute !== HALFTIME_MINUTE).map((sub) => sub.minute)).size;

  return new SubstitutionStatusView({
    used,
    remaining: Math.max(0, MAX_SUBSTITUTIONS_PER_TEAM - used),
    windowsUsed,
    windowsRemaining: Math.max(0, MAX_SUBSTITUTION_WINDOWS_PER_TEAM - windowsUsed),
    capReached: used >= MAX_SUBSTITUTIONS_PER_TEAM || windowsUsed >= MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  });
};

/** Shared tail of `resumeSimulation`/`submitMatchCommand`: given the full (re)derived `MatchEvent`
 * timeline, resolves names, renders Commentary Lines, slices off the chunk after `cursor`, and
 * attaches the ticket 14 substitution-cap/injury-prompt fields. Assumes a `SqlClient` in context. */
const buildResumeSimulationView = (
  matchId: string,
  events: ReadonlyArray<MatchEvent>,
  conditions: ReadonlyMap<string, number>,
  cursor: number,
) =>
  Effect.gen(function* () {
    const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;

    const sql = yield* SqlClient;
    const clubRows = yield* sql<{
      id: string;
      name: string;
    }>`SELECT id, name FROM clubs WHERE id IN (${started.homeClubId}, ${started.awayClubId})`;
    const clubNameById = new Map(clubRows.map((row) => [row.id, row.name]));

    const playerIds = [...new Set(events.flatMap(collectPlayerIds))];
    const playerRows =
      playerIds.length === 0
        ? []
        : yield* sql.unsafe<{ id: string; firstName: string; lastName: string }>(
            `SELECT id, first_name as "firstName", last_name as "lastName" FROM players WHERE id IN (${playerIds.map(() => "?").join(",")})`,
            playerIds,
          );
    const playerNameById = new Map(playerRows.map((row) => [row.id, `${row.firstName} ${row.lastName}`]));

    const names: CommentaryNameResolver = {
      clubName: (clubId) => clubNameById.get(clubId) ?? "Unknown side",
      playerName: (playerId) => playerNameById.get(playerId) ?? "a player",
    };

    const commentarySeed = hashString(matchId);
    const allLines = renderCommentary(events, commentarySeed, names);

    const remaining = events.slice(cursor);
    let chunkLength = 0;
    while (chunkLength < remaining.length && chunkLength < MAX_CHUNK_SIZE) {
      const isBoundary = BOUNDARY_TAGS.has(remaining[chunkLength]!._tag);
      chunkLength += 1;
      if (isBoundary) break;
    }

    const newCursor = cursor + chunkLength;
    const isComplete = newCursor >= events.length;
    const { homeScore, awayScore } = scoreAsOf(events.slice(0, newCursor));
    const lines = allLines
      .slice(cursor, newCursor)
      .map((line) => new CommentaryLineView({ minute: line.minute, tag: line.tag, text: line.text }));

    const chunkEvents = events.slice(cursor, newCursor);
    const injuredClubIds = [
      ...new Set(
        chunkEvents
          .filter((event): event is Extract<MatchEvent, { readonly _tag: "Injury" }> => event._tag === "Injury")
          .map((event) => event.teamClubId),
      ),
    ];
    const injuries = chunkEvents
      .filter((event): event is Extract<MatchEvent, { readonly _tag: "Injury" }> => event._tag === "Injury")
      .map((event) => new InjuryView({
        minute: event.minute,
        teamClubId: event.teamClubId,
        playerId: event.playerId,
        trigger: event.trigger,
        severity: event.severity,
        tier: event.tier,
        type: event.type,
      }));

    return new ResumeSimulationView({
      matchId,
      cursor: newCursor,
      isComplete,
      homeScore,
      awayScore,
      lines,
      homeSubs: computeSubstitutionStatus(started.homeClubId, events),
      awaySubs: computeSubstitutionStatus(started.awayClubId, events),
      injuredClubIds,
      injuries,
      conditions: Object.fromEntries(conditions),
    });
  });

/**
 * `ResumeSimulation` (ticket 13, extended by ticket 14): re-derives the full event timeline from
 * the persisted seed + command journal on every call (`deriveMatchEvents`) and slices off the next
 * chunk after `cursor`. Since `simulateMatch` is pure, this reproduces the exact same events for
 * any minute range no `SubmitMatchCommand` has touched yet — determinism holds by construction.
 */
export const resumeSimulation = (savesDir: string, saveId: string, matchId: string, cursor: number) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      const derived = deriveMatchEvents(stream);
      return yield* buildResumeSimulationView(matchId, derived.events, derived.conditions, cursor);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

type MatchCommandPayloadInput = ChangeTacticsCommandPayload | MakeSubstitutionCommandPayload;

/**
 * `SubmitMatchCommand` (ticket 14): appends the command to the match's stream as a minute-stamped
 * `TacticsChanged`/`SubstitutionMade` journal entry, then re-derives the full timeline (now
 * including the new command) and returns the chunk from `cursor` — the same shape
 * `resumeSimulation` returns, so the renderer's polling loop can treat this call as just another
 * `resumeSimulation` response. The engine caps/rejects invalid commands silently (no error, no
 * `Substitution`/tactic-affecting change in the output) — callers should check `homeSubs`/
 * `awaySubs` rather than assume the command took effect.
 */
export const submitMatchCommand = (
  savesDir: string,
  saveId: string,
  matchId: string,
  cursor: number,
  minute: number,
  isHalftime: boolean,
  command: MatchCommandPayloadInput,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotSacked(saveId);
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      const seq = yield* nextStreamSeq(MATCH_STREAM_TYPE, matchId);
      const tag = command._tag === "ChangeTactics" ? "TacticsChanged" : "SubstitutionMade";
      const payload: PersistedTacticsChanged | PersistedSubstitutionMade =
        command._tag === "ChangeTactics"
          ? { _tag: "TacticsChanged", minute, isHalftime, clubId: command.clubId, tactic: command.tactic }
          : {
              _tag: "SubstitutionMade",
              minute,
              isHalftime,
              clubId: command.clubId,
              outPlayerId: command.outPlayerId,
              inPlayerId: command.inPlayerId,
            };
      yield* appendStreamEvents(MATCH_STREAM_TYPE, matchId, seq, [{ tag, payload }]);

      const derived = deriveMatchEvents([...stream, { seq, tag, payload }]);
      return yield* buildResumeSimulationView(matchId, derived.events, derived.conditions, cursor);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
