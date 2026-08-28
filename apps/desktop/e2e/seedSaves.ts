import path from "node:path";
import { Effect } from "effect";
import { advanceCalendar } from "../src/main/season.js";
import { createSave } from "../src/main/saves.js";

/** The app stores saves under `<userDataDir>/saves` (src/main/index.ts). */
export const savesDir = (userDataDir: string) => path.join(userDataDir, "saves");

const TOTAL_MATCHDAYS = 38;
const MAX_ADVANCES = 200;

const createSeedSave = (savesDir: string, name: string) =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, name);
    return save.id;
  });

/** A fresh save: just `createSave`, no calendar advances. The season sits at Matchday 0. */
export const seedFresh = (savesDir: string) =>
  Effect.runPromise(createSeedSave(savesDir, "Seed: fresh"));

/** A save right at Season start, before Matchday 1 has been played — the same state as `seedFresh`
 *  (both are Matchday 0), named for the journeys that lean on the pre-first-match state. */
export const seedBeforeMatchday = (savesDir: string) =>
  Effect.runPromise(createSeedSave(savesDir, "Seed: before-matchday"));

/** A save advanced to just before the final Matchday (Matchday 38). */
export const seedBeforeSeasonEnd = (savesDir: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const id = yield* createSeedSave(savesDir, "Seed: before-season-end");
      let guard = 0;
      let matchday = 0;
      while (matchday < TOTAL_MATCHDAYS - 1 && guard < MAX_ADVANCES) {
        guard += 1;
        const result = yield* advanceCalendar(savesDir, id);
        matchday = result.season.currentMatchday;
      }
      return id;
    }),
  );

/** A save advanced all the way to `season_complete`, where a board verdict exists. */
export const seedConcluded = (savesDir: string) =>
  Effect.runPromise(
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
        return yield* Effect.fail(new Error("season did not conclude within bounded advances"));
      }
      return id;
    }),
  );