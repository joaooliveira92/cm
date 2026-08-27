import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  ClubNotFoundError,
  ClubSummary,
  CommentaryLineView,
  MatchNotFoundError,
  MatchSummary,
  ResumeSimulationView,
  SaveNotFoundError,
  Tactic,
} from "@cm-clone/contracts";
import { simulateMatch, type MatchEvent, type MatchTeamSetup } from "@cm-clone/game-engine";
import {
  FORMATION_SLOTS,
  POSITION_ROLES,
  renderCommentary,
  type CommentaryNameResolver,
  type PlayerAttributes,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, loadStreamEvents, nextStreamSeq } from "./decider.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { loadPersistedTactic } from "./tactics.js";

/** The Match Decider's stream type (ADR-0007) — `streamId` is a fresh matchId per started match. */
const MATCH_STREAM_TYPE = "match";

/** Chunk size cap for a single `ResumeSimulation` response when no boundary event is hit first
 * (ADR-0007: chunked resimulation, no RPC streaming) — the renderer paces reveal client-side. */
const MAX_CHUNK_SIZE = 40;

const BOUNDARY_TAGS: ReadonlySet<MatchEvent["_tag"]> = new Set(["HalfTimeReached", "FullTimeWhistle"]);

const withExistingSave = <A, E>(
  savesDir: string,
  saveId: string,
  onFound: (filename: string) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      readdir(savesDir).then((entries) => entries.includes(`${saveId}.sqlite`)),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }
    return yield* onFound(filename);
  });

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

/**
 * `StartMatch` (ticket 13): runs `simulateMatch` once, seeded from a fresh matchId, and persists
 * the full resulting `MatchEvent` timeline into a brand-new Match Decider stream (ADR-0007). The
 * simulation itself never re-runs — `resumeSimulation` only ever reads this stream back.
 */
export const startMatch = (savesDir: string, saveId: string, opponentClubId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const userClub = yield* loadUserClub;
      const opponentClub = yield* loadClubSummary(opponentClubId);
      if (!opponentClub) return yield* new ClubNotFoundError({ id: opponentClubId });
      if (opponentClub.id === userClub.id) return yield* new ClubNotFoundError({ id: opponentClubId });

      const home = yield* loadTeamSetup(userClub.id);
      const away = yield* loadTeamSetup(opponentClub.id);

      const matchId = randomUUID();
      // Deterministic per match (ADR-0002) — Date.now() picks a fresh seed per `StartMatch` call,
      // matchId keeps every call's seed distinct even within the same millisecond.
      const seed = (Date.now() ^ hashString(matchId)) >>> 0;
      const events = simulateMatch({ seed, home, away });

      const startSeq = yield* nextStreamSeq(MATCH_STREAM_TYPE, matchId);
      yield* appendStreamEvents(
        MATCH_STREAM_TYPE,
        matchId,
        startSeq,
        events.map((event) => ({ tag: event._tag, payload: event })),
      );

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
 * `ResumeSimulation` (ticket 13): the persisted event timeline never changes once `StartMatch` has
 * written it (ADR-0007 — resimulation is resimulation-transparent by construction here, since the
 * whole timeline is computed and persisted up front rather than incrementally), so this just reads
 * the stream back and slices off the next chunk after `cursor`. Commentary Lines are rendered fresh
 * from the *entire* event list on every call (cheap — a few hundred events) so the last-used-
 * template exclusion (ADR-0008) is always correct without persisting any extra state.
 */
export const resumeSimulation = (savesDir: string, saveId: string, matchId: string, cursor: number) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

      const events = stream.map((row) => row.payload as MatchEvent);
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

      return new ResumeSimulationView({ matchId, cursor: newCursor, isComplete, homeScore, awayScore, lines });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
