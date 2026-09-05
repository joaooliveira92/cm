import path from "node:path";
import { Effect, Schema } from "effect";
import { advanceCalendar } from "../src/main/season/index.js";
import { createSave } from "../src/main/saves.js";

const run = <A, E>(effect: Effect.Effect<A, E>): Promise<A> => Effect.runPromise(effect);

/** The app stores saves under `<userDataDir>/saves` (src/main/index.ts). */
export const savesDir = (userDataDir: string) => path.join(userDataDir, "saves");

/** A seed helper that advanced the calendar to its bound without the Season concluding: the
 *  fixture list, not the test, is wrong. Tagged so it stays distinguishable in the failure
 *  channel rather than merging with every other untagged `Error`. */
export class SeasonNeverConcludedError extends Schema.TaggedError<SeasonNeverConcludedError>()(
  "SeasonNeverConcludedError",
  { advances: Schema.Finite },
) {}

const MAX_ADVANCES = 200;
/** Deep enough into the season for a league table to have shape, short of its conclusion. */
const ADVANCES_BEFORE_SEASON_END = 30;

const createSeedSave = (savesDir: string, name: string) =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, name);
    return save.id;
  });

/** A fresh save: just `createSave`, no calendar advances. The season sits at Matchday 0. */
export const seedFresh = (savesDir: string) => run(createSeedSave(savesDir, "Seed: fresh"));

/** A save with an arbitrary name — used where a test needs a specific continue-list label
 *  (duplicate names, the rebind journey's relaunch target). */
export const seedNamed = (savesDir: string, name: string) => run(createSeedSave(savesDir, name));

/** A save right at Season start, before the first fixture has been played — the same state as
 *  `seedFresh` (both stand in the pre-season), named for the journeys that lean on it. */
export const seedBeforeMatchday = (savesDir: string) =>
  run(createSeedSave(savesDir, "Seed: before-matchday"));

/** A save advanced deep into the season but not to its end — enough football played for a table
 *  to mean something, with the conclusion still ahead. */
export const seedBeforeSeasonEnd = (savesDir: string) =>
  run(
    Effect.gen(function* () {
      const id = yield* createSeedSave(savesDir, "Seed: before-season-end");
      let guard = 0;
      while (guard < ADVANCES_BEFORE_SEASON_END) {
        guard += 1;
        const result = yield* advanceCalendar(savesDir, id);
        if (result.seasonConcluded) break;
      }
      return id;
    }),
  );

/** A save advanced all the way to `season_complete`, where a board verdict exists. */
export const seedConcluded = (savesDir: string) =>
  run(
    Effect.gen(function* () {
      const id = yield* createSeedSave(savesDir, "Seed: concluded");
      let guard = 0;
      let concluded = false;
      while (!concluded && guard < MAX_ADVANCES) {
        guard += 1;
        const result = yield* advanceCalendar(savesDir, id);
        concluded = result.seasonConcluded;
      }
      if (!concluded) {
        return yield* new SeasonNeverConcludedError({ advances: guard });
      }
      return id;
    }),
  );