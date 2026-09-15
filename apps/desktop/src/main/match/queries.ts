/**
 * The match read side: `ResumeSimulation`, which re-derives the whole timeline from the persisted
 * seed plus command journal on every call and hands back the next chunk after `cursor`.
 *
 * Read-shaped, and deliberately so. Observing `FullTimeWhistle` here commits nothing — the career
 * accepts a result through `commitMatchday`, so no durable state depends on polling cadence.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import { MatchNotFoundError, type MatchId, type SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { loadStreamEvents, withExistingSave } from "../season/decider.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents } from "./stream.js";
import { buildResumeSimulationView } from "./view.js";

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
