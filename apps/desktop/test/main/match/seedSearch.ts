/**
 * Seed repinning: find a match seed that still has the property a pinned constant is named for.
 *
 * A pinned seed is coupled to the engine's draw order and to the `WORLD_SEED` world's squads, so an
 * engine change invalidates it — the spec's own guard then fails with `repin <CONSTANT>`. Repinning
 * means enumerating seeds through the same path the specs take and finding a replacement.
 *
 * This helper does that once, cheaply: it starts a single match to capture the kickoff setups and the
 * AI clubs' preferences, then re-derives the timeline for each candidate seed with `deriveMatchEvents`
 * — no per-seed database work. It **must** pass the AI preferences; a reader that omits them replays a
 * different match from the one the manager watched (see `main/match/aiPreferences.ts`).
 *
 * Use it from a throwaway spec, then delete the spec and pin the seeds it printed:
 *
 *     const seeds = yield* findMatchSeeds(savesDir, (events) => events.some((e) => e._tag === "Injury"));
 *     console.log(seeds.map((s) => s.seed)); // e.g. [3, 5, 10, 12, 15]
 *
 * `commands` are journal rows (`SubstitutionMade` / `ForceOffMade` / `TacticsChanged`) appended before
 * every derived match, for a property that needs the manager's input — a goalkeeper stand-in, a
 * forced substitution at the window cap.
 */
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { MATCH_STREAM_TYPE, deriveMatchEvents, matchStartedOf, type MatchEvent } from "@cm-clone/game-engine";
import { matchAiPreferences } from "../../../src/main/match/aiPreferences.js";
import { loadStreamEvents, withExistingSave, type StreamEvent } from "../../../src/main/season/decider.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

export interface SeedMatch {
  readonly seed: number;
  readonly events: ReadonlyArray<MatchEvent>;
}

export interface SeedSearchOptions {
  /** Stop after this many matches. Default 5. */
  readonly limit?: number;
  /** The highest seed to try. Default 60_000. */
  readonly maxSeed?: number;
  /** Journal rows to apply before every derived match. */
  readonly commands?: ReadonlyArray<StreamEvent>;
}

/** Every seed up to `maxSeed` whose derived match satisfies `predicate`, first `limit` found. */
export const findMatchSeeds = (
  savesDir: string,
  predicate: (events: ReadonlyArray<MatchEvent>) => boolean,
  options: SeedSearchOptions = {},
) => {
  const limit = options.limit ?? 5;
  const maxSeed = options.maxSeed ?? 60_000;
  const commands = options.commands ?? [];

  return Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 1);
    const { stream, prefs } = yield* withExistingSave(savesDir, save.id, (filename) =>
      Effect.gen(function* () {
        const loaded = yield* loadStreamEvents(MATCH_STREAM_TYPE, match.matchId);
        const preferences = yield* matchAiPreferences(loaded);
        return { stream: loaded, prefs: preferences };
      }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
    );

    const started = matchStartedOf(stream);
    const baseRow = stream[0]!;
    const found: Array<SeedMatch> = [];
    for (let seed = 1; seed <= maxSeed && found.length < limit; seed++) {
      const reseeded = [{ ...baseRow, payload: { ...started, seed } }, ...commands] as ReadonlyArray<StreamEvent>;
      const events = deriveMatchEvents(reseeded, prefs).events;
      if (predicate(events)) found.push({ seed, events });
    }
    return found;
  });
};