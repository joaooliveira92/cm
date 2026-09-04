import { randomUUID } from "node:crypto";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  ClubNotFoundError,
  ClubSummary,
  CommentaryLineView,
  InjuryView,
  MatchId,
  MatchNotFoundError,
  MatchSummary,
  ResumeSimulationView,
  SubstitutionStatusView,
  Tactic,
  type ChangeTacticsCommandPayload,
  type ClubId,
  type ForceOffCommandPayload,
  type MakeSubstitutionCommandPayload,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  MAX_SUBSTITUTIONS_PER_TEAM,
  MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  simulateMatchWithCounts,
  type MatchCommand,
  type MatchEvent,
  type MatchPlayerCountEntry,
  type MatchTeamSetup,
} from "@cm-clone/game-engine";
import {
  FORMATION_SLOTS,
  POSITION_ROLES,
  renderCommentary,
  type CommentaryNameResolver,
  type PillarDistribution,
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
import { displayNames } from "./displayNames.js";
import { assertSaveNotArchived } from "./managerStatus.js";
import { loadManagerProfile } from "./managerProfile.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { loadPersistedTactic } from "./tactics.js";

/**
 * The Match Decider's stream type (ADR-0007).
 *
 * `streamId` is **the fixture's own id**, rendered as text. The `events.stream_id` column is text
 * and carries no foreign key precisely because the stream type decides what it points at — a match
 * stream's id is a fixture, a season stream's is the save, a club stream's is a club — and one
 * column cannot reference three tables.
 */
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
    readonly id: PlayerId;
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
const loadTeamSetup = (clubId: ClubId) =>
  Effect.gen(function* () {
    const squad = yield* loadSquadPlayers(clubId);
    const persisted = yield* loadPersistedTactic(clubId);
    const tactic = persisted ?? synthesizeDefaultTactic(squad);
    const setup: MatchTeamSetup = {
      clubId,
      squad: squad.map((player) => ({
        id: player.id,
        attributes: player.attributes as PlayerAttributes,
        // A player carrying a Condition shortfall from the Season's fitness ledger (ticket 10)
        // kicks off the live match below full.
        startingCondition: player.condition,
      })),
      tactic,
    };
    return setup;
  });

const loadClubSummary = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const rows = yield* sql<{
      id: ClubId;
      statureTier: "big" | "mid" | "small";
    }>`SELECT id, stature_tier as "statureTier" FROM clubs WHERE id = ${clubId}`;
    const row = rows[0];
    if (row === undefined) return null;
    return yield* Schema.decodeUnknownEffect(ClubSummary)({ ...row, name: nameOf(row.id) });
  });

/** Every club but the user's own — the "pick-an-opponent" stopgap this ticket uses in place of a
 * fixture list (ticket 15, in parallel, will supersede this with real fixtures). */
export const listOpponentClubs = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const nameOf = yield* displayNames;
      const club = yield* loadUserClub;
      const clubRows = yield* sql<{
        id: ClubId;
        statureTier: "big" | "mid" | "small";
      }>`SELECT id, stature_tier as "statureTier" FROM clubs WHERE id != ${club.id}`;
      // Alphabetical by *display* name, so the order the player reads follows the pack rather than
      // the identifiers underneath it. The database can no longer sort this list.
      const rows = clubRows
        .map((row) => ({ ...row, name: nameOf(row.id) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      // Pure, synchronous schema decoding over an already-materialized result set — no IO per
      // item, so concurrency buys nothing and only adds fiber overhead. Explicit `concurrency: 1`
      // states the sequential intent rather than relying on `Effect.forEach`'s default.
      return yield* Effect.forEach(rows, (row) => Schema.decodeEffect(ClubSummary)(row), { concurrency: 1 });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/** The decider-level `MatchStarted` stream event payload (seq 1 of every "match" stream) — the
 * seed plus a frozen kickoff snapshot of both teams' squad + starting Tactic plus the full Manager
 * Pillar Distribution (ticket 03). Snapshotting the setups here (rather than re-reading
 * `tactics`/`players` tables on every resimulation) is what keeps resimulation pure and
 * prefix-stable: an unrelated `ChangeTactics` saved from the Tactics screen mid-match must not
 * retroactively rewrite the kickoff tactic this match already resolved minutes of play against. */
interface PersistedMatchStarted {
  readonly seed: number;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly homeSetup: MatchTeamSetup;
  readonly awaySetup: MatchTeamSetup;
  readonly pillars: PillarDistribution;
}

/** Ticket 14 mid-match command journal entries — one per accepted `SubmitMatchCommand` call,
 * appended after seq 1. `minute`/`isHalftime` mirror `simulateMatch`'s `commandsByMinute` /
 * `halftimeCommands` split. */
interface PersistedTacticsChanged {
  readonly _tag: "TacticsChanged";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: ClubId;
  readonly tactic: Tactic;
}

interface PersistedSubstitutionMade {
  readonly _tag: "SubstitutionMade";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: ClubId;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
}

/** Ticket 11 `ForceOff` journal entry — the manager's orange "bring off" (no-subs), a forced-off
 * to 10 men that consumes no substitution/window, stored so resimulation reproduces it. */
interface PersistedForcedOff {
  readonly _tag: "ForceOffMade";
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly clubId: ClubId;
  readonly playerId: PlayerId;
}

/**
 * `StartMatch` (ticket 13, extended by ticket 14): persists only the seed + kickoff team setups —
 * never the resulting `MatchEvent` timeline. `resumeSimulation`/`submitMatchCommand` resimulate
 * from this plus the mid-match command journal on every call (`deriveMatchEvents` below):
 * `simulateMatch` is pure and sub-millisecond (ADR-0007), so recomputing beats persisting a
 * timeline that a later `SubmitMatchCommand` would have to invalidate and recompute anyway.
 */
export const startMatch = (savesDir: string, saveId: SaveId, opponentClubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);
      const userClub = yield* loadUserClub;
      const opponentClub = yield* loadClubSummary(opponentClubId);
      if (!opponentClub) return yield* new ClubNotFoundError({ id: opponentClubId });
      if (opponentClub.id === userClub.id) return yield* new ClubNotFoundError({ id: opponentClubId });

      const homeSetup = yield* loadTeamSetup(userClub.id);
      const awaySetup = yield* loadTeamSetup(opponentClub.id);

      // Snapshot the Manager Pillars at match start for deterministic replay (ticket 03). Only
      // the human club has a manager profile — AI clubs have none, so fall back to neutral (3).
      const profile = yield* loadManagerProfile;
      const pillars = profile ? profile.pillars : { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 };

      // The fixture this match plays out, which is what the stream is keyed on. Restores the
      // keyspace the code drifted from while matches predated real fixtures: a match stream and the
      // fixture it belongs to were two identities for one thing.
      const fixtures = yield* sql<{ id: number }>`
        SELECT f.id FROM fixtures f
        WHERE f.played = 0 AND f.season_number = (SELECT MAX(season_number) FROM season)
          AND ((f.home_club_id = ${userClub.id} AND f.away_club_id = ${opponentClubId})
            OR (f.home_club_id = ${opponentClubId} AND f.away_club_id = ${userClub.id}))
        ORDER BY f.scheduled_date ASC, f.id ASC LIMIT 1`;

      // A match with no fixture behind it is not a state the game produces — every match the human
      // plays is one the calendar scheduled. The fallback exists so a caller that reaches here
      // without one gets a usable stream rather than a crash, and it is the only id in this
      // codebase that is not derived from the world.
      const matchId = MatchId.make(
        fixtures[0] === undefined ? randomUUID() : String(fixtures[0].id),
      );
      // The seed's entropy is unchanged by this ticket, and deliberately so. It used to come from
      // the clock plus the fresh uuid the stream was keyed on; the stream is keyed on the fixture
      // now, so the uuid stays purely as the seed's distinguisher — two starts of the same fixture
      // within one millisecond still play differently.
      //
      // That leaves the match seed clock-derived, which is the one seed in this codebase that is
      // not a function of the world. Making it `deriveSeed(worldSeed, "match", fixtureId)` would
      // make a watched match as reproducible as a background one already is, and is a change to
      // ADR-0002's determinism story rather than to where a stream is keyed — so it is not made
      // here.
      const seed = (Date.now() ^ hashString(randomUUID())) >>> 0;

      const started: PersistedMatchStarted = {
        seed,
        homeClubId: userClub.id,
        awayClubId: opponentClub.id,
        homeSetup,
        awaySetup,
        pillars,
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

/** Every case is listed explicitly and there is no `default:` — a new `MatchEvent` variant then
 * makes the end of the function reachable, which `tsc` rejects against the declared return type.
 * A `default: return [event.playerId]` compiled fine and broke at runtime on any new variant
 * without a `playerId`. */
const collectPlayerIds = (event: MatchEvent): ReadonlyArray<string> => {
  switch (event._tag) {
    case "Goal":
    case "ShotOnTarget":
    case "ShotMissed":
    case "BigChance":
    case "YellowCard":
    case "RedCard":
    case "Injury":
      return [event.playerId];
    case "Substitution":
      return [event.outPlayerId, event.inPlayerId];
    case "MatchStarted":
    case "HalfTimeReached":
    case "FullTimeWhistle":
      return [];
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
  readonly conditions: ReadonlyMap<PlayerId, number>;
  readonly counts: ReadonlyArray<MatchPlayerCountEntry>;
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
    } else if (row.tag === "ForceOffMade") {
      const p = row.payload as PersistedForcedOff;
      schedule({ _tag: "ForceOff", clubId: p.clubId, playerId: p.playerId }, p.minute, p.isHalftime);
    }
  }

  return simulateMatchWithCounts({
    seed: started.seed,
    home: started.homeSetup,
    away: started.awaySetup,
    commandsByMinute,
    halftimeCommands,
  });
};

/** Reads the on-pitch head-counts for both clubs as of the given event (ticket 11): the latest
 * `MatchPlayerCountEntry` at or before the event's `(half, minute)` in simulation order. Falls back
 * to 11-on-11 if no snapshot precedes it (e.g. the `MatchStarted` first event). */
const onPitchCountsFor = (
  counts: ReadonlyArray<MatchPlayerCountEntry>,
  event: MatchEvent,
): { readonly homeCount: number; readonly awayCount: number } => {
  if (event._tag === "MatchStarted") return { homeCount: 11, awayCount: 11 };
  const minute = event.minute;
  const half = (event as { readonly half?: 1 | 2 }).half ?? (minute <= HALFTIME_MINUTE ? 1 : 2);
  let match: MatchPlayerCountEntry | undefined;
  for (const entry of counts) {
    if (entry.half === half && entry.minute <= minute) match = entry;
  }
  return match ? { homeCount: match.homeCount, awayCount: match.awayCount } : { homeCount: 11, awayCount: 11 };
};

/** Per-club substitution cap status (ticket 14) computed straight from the derived `MatchEvent`
 * timeline's accepted `Substitution` events — authoritative for "used" (the engine only ever emits
 * a `Substitution` event when it actually accepted the command), an approximation for "windows
 * used" (see `HALFTIME_MINUTE`'s doc comment above). */
const computeSubstitutionStatus = (clubId: ClubId, events: ReadonlyArray<MatchEvent>): SubstitutionStatusView => {
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
  matchId: MatchId,
  events: ReadonlyArray<MatchEvent>,
  conditions: ReadonlyMap<PlayerId, number>,
  counts: ReadonlyArray<MatchPlayerCountEntry>,
  cursor: number,
) =>
  Effect.gen(function* () {
    const started = events[0] as Extract<MatchEvent, { readonly _tag: "MatchStarted" }>;

    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const clubNameById = new Map<string, string>(
      [started.homeClubId, started.awayClubId].map((id) => [id, nameOf(id)]),
    );

    const playerIds = [...new Set(events.flatMap(collectPlayerIds))];
    const playerRows =
      playerIds.length === 0
        ? []
        : yield* sql.unsafe<{ id: PlayerId; firstName: string; lastName: string }>(
            `SELECT id, first_name as "firstName", last_name as "lastName" FROM players WHERE id IN (${playerIds.map(() => "?").join(",")})`,
            playerIds,
          );
    const playerNameById = new Map<string, string>(playerRows.map((row) => [row.id, `${row.firstName} ${row.lastName}`]));

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

    const lastEvent = chunkEvents[chunkEvents.length - 1] ?? events[events.length - 1]!;
    const { homeCount, awayCount } = onPitchCountsFor(counts, lastEvent);

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
      homeOnPitchCount: homeCount,
      awayOnPitchCount: awayCount,
      conditions: Object.fromEntries(conditions),
    });
  });

/**
 * `ResumeSimulation` (ticket 13, extended by ticket 14): re-derives the full event timeline from
 * the persisted seed + command journal on every call (`deriveMatchEvents`) and slices off the next
 * chunk after `cursor`. Since `simulateMatch` is pure, this reproduces the exact same events for
 * any minute range no `SubmitMatchCommand` has touched yet — determinism holds by construction.
 */
export const resumeSimulation = (savesDir: string, saveId: SaveId, matchId: MatchId, cursor: number) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      const derived = yield* Effect.sync(() => deriveMatchEvents(stream));
      return yield* buildResumeSimulationView(matchId, derived.events, derived.conditions, derived.counts, cursor);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

type MatchCommandPayloadInput = ChangeTacticsCommandPayload | MakeSubstitutionCommandPayload | ForceOffCommandPayload;

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
  saveId: SaveId,
  matchId: MatchId,
  cursor: number,
  minute: number,
  isHalftime: boolean,
  command: MatchCommandPayloadInput,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      const seq = yield* nextStreamSeq(MATCH_STREAM_TYPE, matchId);
      const tag = command._tag === "ChangeTactics" ? "TacticsChanged" : command._tag === "MakeSubstitution" ? "SubstitutionMade" : "ForceOffMade";
      const payload: PersistedTacticsChanged | PersistedSubstitutionMade | PersistedForcedOff =
        command._tag === "ChangeTactics"
          ? { _tag: "TacticsChanged", minute, isHalftime, clubId: command.clubId, tactic: command.tactic }
          : command._tag === "MakeSubstitution"
            ? {
                _tag: "SubstitutionMade",
                minute,
                isHalftime,
                clubId: command.clubId,
                outPlayerId: command.outPlayerId,
                inPlayerId: command.inPlayerId,
              }
            : { _tag: "ForceOffMade", minute, isHalftime, clubId: command.clubId, playerId: command.playerId };
      yield* appendStreamEvents(MATCH_STREAM_TYPE, matchId, seq, [{ tag, payload }]);

      const derived = yield* Effect.sync(() => deriveMatchEvents([...stream, { seq, tag, payload }]));
      return yield* buildResumeSimulationView(matchId, derived.events, derived.conditions, derived.counts, cursor);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
