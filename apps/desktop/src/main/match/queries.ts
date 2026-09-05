/**
 * The match read side: the opponent list a match is started against, and `ResumeSimulation`, which
 * re-derives the whole timeline from the persisted seed plus command journal on every call and
 * hands back the next chunk after `cursor`.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  ClubSummary,
  MatchNotFoundError,
  type ClubId,
  type MatchId,
  type SaveId,
} from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadUserClub } from "../club/squad.js";
import { loadStreamEvents, withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents } from "./stream.js";
import { buildResumeSimulationView } from "./view.js";

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
