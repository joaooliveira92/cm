import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { advanceCalendar } from "../src/main/season/index.js";
import { createSave } from "../test/seeded-save.js";
import { advanceThroughBoundary, pendingFixtureId } from "../test/main/boundary-helpers.js";

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

/** The seed's first Continue did not stop at the human club's Fixture. The first Continue of a career
 *  is meant to reach Matchday 1 in one press, so this is the Calendar, not the spec, being wrong. */
export class NoPendingFixtureError extends Schema.TaggedError<NoPendingFixtureError>()(
  "NoPendingFixtureError",
  {},
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

/**
 * A fresh save whose club has already scouted two rival Clubs: the first Club's first two Players at
 * 40 and 100 (Fully Scouted), and one Player of the second at 15. Progress rows are written directly,
 * as the main-process tests do, so the seed costs no played Matchday.
 */
export const seedScouted = (savesDir: string) =>
  run(
    Effect.gen(function* () {
      const id = yield* createSeedSave(savesDir, "Seed: scouted");
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient;
        const user = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
        const rivals = yield* sql<{ id: string }>`
          SELECT DISTINCT c.id FROM clubs c JOIN players p ON p.club_id = c.id
          WHERE c.is_user_club = 0 ORDER BY c.id LIMIT 2`;
        const seeded: Array<readonly [string, number]> = [];
        for (const [index, rival] of rivals.entries()) {
          const players = yield* sql<{ id: string }>`
            SELECT id FROM players WHERE club_id = ${rival.id} ORDER BY id LIMIT 2`;
          const progress = index === 0 ? [40, 100] : [15];
          for (const [at, value] of progress.entries()) {
            const player = players[at];
            if (player !== undefined) seeded.push([player.id, value]);
          }
        }
        for (const [playerId, progress] of seeded) {
          yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress)
                     VALUES (${user[0]!.id}, ${playerId}, ${progress})`;
        }
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`) })),
        Effect.scoped,
      );
      return id;
    }),
  );

/**
 * A fresh save whose club has already completed three transfers: one Player bought in from a rival,
 * one sold out to a rival, and one **Free Agent** signed for a Credits 0 fee with no Club to leave.
 * A fourth row moves a Player between two rivals, so the screen has something it must exclude.
 *
 * `player_transfers` rows are written directly, as the main-process tests do, so the seed costs no
 * played Matchday: driving real Bids to completion would need an open Transfer Window and several
 * advances, and this screen is a pure read over rows that already exist.
 */
export const seedTransferred = (savesDir: string) =>
  run(
    Effect.gen(function* () {
      const id = yield* createSeedSave(savesDir, "Seed: transferred");
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient;
        const user = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
        const rivals = yield* sql<{ id: string }>`
          SELECT DISTINCT c.id FROM clubs c JOIN players p ON p.club_id = c.id
          WHERE c.is_user_club = 0 ORDER BY c.id LIMIT 2`;
        const ours = yield* sql<{ id: string }>`
          SELECT id FROM players WHERE club_id = ${user[0]!.id} ORDER BY id LIMIT 3`;
        const userId = user[0]!.id;
        const [rivalA, rivalB] = [rivals[0]!.id, rivals[1]!.id];

        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
                   VALUES (${ours[0]!.id}, ${rivalA}, ${userId}, '2026-08-20', 3000000)`;
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
                   VALUES (${ours[1]!.id}, ${userId}, ${rivalB}, '2026-07-02', 1500000)`;
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
                   VALUES (${ours[2]!.id}, NULL, ${userId}, '2026-07-01', 0)`;
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
                   VALUES (${ours[0]!.id}, ${rivalA}, ${rivalB}, '2026-09-09', 900000)`;
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`) })),
        Effect.scoped,
      );
      return id;
    }),
  );

/**
 * A save standing at the pre-match boundary of Matchday 1: one Continue pressed, the Calendar stopped
 * before the human club's Fixture, nothing of that Matchday resolved and no match started.
 *
 * Match day only offers a match for the Fixture the Calendar is holding, so a pre-season save shows
 * "No Fixture is waiting". The seed presses Continue through the real `advanceCalendar` rather than
 * writing the boundary columns, and leaves the Tactic unset: the journeys set it through the editor.
 */
export const seedBeforeMatchday = (savesDir: string) =>
  run(
    Effect.gen(function* () {
      const id = yield* createSeedSave(savesDir, "Seed: before-matchday");
      yield* advanceCalendar(savesDir, id);
      if ((yield* pendingFixtureId(savesDir, id)) === null) {
        return yield* new NoPendingFixtureError();
      }
      return id;
    }),
  );

/** A save advanced deep into the season but not to its end — enough football played for a table
 *  to mean something, with the conclusion still ahead. */
export const seedBeforeSeasonEnd = (savesDir: string) =>
  run(
    Effect.gen(function* () {
      const id = yield* createSeedSave(savesDir, "Seed: before-season-end");
      let guard = 0;
      while (guard < ADVANCES_BEFORE_SEASON_END) {
        guard += 1;
        const stepped = yield* advanceThroughBoundary(savesDir, id);
        if (stepped.seasonConcluded) break;
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
        concluded = (yield* advanceThroughBoundary(savesDir, id)).seasonConcluded;
      }
      if (!concluded) {
        return yield* new SeasonNeverConcludedError({ advances: guard });
      }
      return id;
    }),
  );