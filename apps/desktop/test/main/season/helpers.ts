import path from "node:path";
import type { ClubId, SaveId, SnapshotId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { beginCareer, commitCareer } from "../../../src/main/world/index.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";
import { loadStreamEvents } from "../../../src/main/season/decider.js";
import { createDefaultSnapshot } from "../snapshot-helpers.js";

/**
 * The builders every season spec shares.
 *
 * Each spec file owns its own temp saves directory, minted per test in its own `beforeEach`, so
 * the directory arrives here as a getter rather than a value — these builders are constructed once
 * per module but read the directory at call time. Nothing here generates a world by itself: a
 * world costs one `createCareerFrom*` call inside the test that needs it, exactly as it did when
 * these specs were one file.
 *
 * **A test that plays a whole four-division season gets a file to itself.** `playUntilSeason` on a
 * pyramid costs ~6 minutes, because a season is ~38 presses of Continue and each press opens the
 * save four times. vitest parallelises across files but never within one, so two such tests in one
 * file serialise onto a single worker and their sum becomes the whole suite's critical path — which
 * is what `rollover.test.ts` and `retention.test.ts` each were until they were split.
 */
export const seasonHelpers = (savesDir: () => string) => {
  const loadSeasonStreamEvents = (saveId: SaveId) =>
    loadStreamEvents("season", saveId).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir(), `${saveId}.sqlite`), readonly: true })),
      Effect.scoped,
    );

  /** The first club by insert order — mirrors `createSave`'s compat-shim user-club choice. */
  const loadFirstClubId = (saveId: SaveId) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs ORDER BY rowid LIMIT 1`;
      return rows[0]!.id;
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir(), `${saveId}.sqlite`) })),
      Effect.scoped,
    );

  /** A committed career at an arbitrary scope, which is what puts more than one competition in the
   *  world — the default scope is one league and its cup. */
  const createCareerFrom = (snapshotId: SnapshotId, worldSeed: number, name: string) =>
    Effect.gen(function* () {
      const { id } = yield* beginCareer(savesDir(), {
        worldSeed,
        referenceYear: 2026,
        userDataDir: savesDir(),
        snapshotId,
      });
      const selectedClubId = yield* loadFirstClubId(id);
      return yield* commitCareer(savesDir(), id, name, selectedClubId, {
        managerName: name,
        archetypeOrigin: "custom",
        pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
      });
    });

  /** A committed career generated deterministically from a world seed (ticket 01). */
  const createCareerFromWorldSeed = (worldSeed: number, name: string) =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir());
      const { id } = yield* beginCareer(savesDir(), {
        worldSeed,
        referenceYear: 2026,
        userDataDir: savesDir(),
        snapshotId,
      });
      const selectedClubId = yield* loadFirstClubId(id);
      return yield* commitCareer(savesDir(), id, name, selectedClubId, {
        managerName: name,
        archetypeOrigin: "custom",
        pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
      });
    });

  /** A writable connection to a save, for tests that have to stage a world state by hand. */
  const withSaveWrite = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
    effect.pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir(), `${saveId}.sqlite`) })),
      Effect.scoped,
    );

  /** Every fixture that has actually been played, with the competition it belongs to. */
  const loadResolvedFixtures = (saveId: string) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<{ competitionId: string; scheduledDate: string }>`
      SELECT competition_id as "competitionId", scheduled_date as "scheduledDate"
      FROM fixtures WHERE played = 1`;
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir(), `${saveId}.sqlite`), readonly: true })),
      Effect.scoped,
    );

  /**
   * Plays seasons until the save has rolled into `target`.
   *
   * Each iteration is one press of Continue *plus* the human Fixture it may have stopped at, which
   * is what one `advanceCalendar` used to mean on its own. Without playing through the boundary the
   * loop would spin on the first Matchday for all two hundred iterations.
   */
  const playUntilSeason = (saveId: SaveId, target: number) =>
    Effect.gen(function* () {
      for (let advance = 0; advance < 200; advance += 1) {
        const stepped = yield* advanceThroughBoundary(savesDir(), saveId);
        if (stepped.advance.season.seasonNumber >= target) return true;
      }
      return false;
    });

  /** Every competition's field for one season, keyed by competition, in frozen order where frozen. */
  const loadFields = (saveId: string, seasonNumber: number) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{
        competitionId: string;
        clubId: string;
        finalPosition: number | null;
        points: number | null;
      }>`SELECT competition_id as "competitionId", club_id as "clubId",
              final_position as "finalPosition", points
       FROM competition_participants WHERE season_number = ${seasonNumber}
       ORDER BY competition_id ASC, final_position ASC, club_id ASC`;
      const fields = new Map<string, Array<(typeof rows)[number]>>();
      for (const row of rows) fields.set(row.competitionId, [...(fields.get(row.competitionId) ?? []), row]);
      return fields;
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir(), `${saveId}.sqlite`), readonly: true })),
      Effect.scoped,
    );

  /** What survives of a season on disk: its fixtures by competition, and its match streams. */
  const survivingSeason = (saveId: string, seasonNumber: number) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const fixtures = yield* sql<{ competitionId: string; id: number }>`
      SELECT competition_id as "competitionId", id FROM fixtures
      WHERE season_number = ${seasonNumber} ORDER BY id ASC`;
      const streams = yield* sql<{ streamId: string }>`
      SELECT DISTINCT stream_id as "streamId" FROM events WHERE stream_type = 'match'`;
      // Every fixture in the save, not just this season's. Match streams are not season-scoped, so
      // checking them against one season's fixtures would call a live season-2 stream an orphan. That
      // used to be unreachable — the human's league Fixture resolved headlessly and no stream existed
      // for it — and became reachable the moment every human Matchday started producing one.
      const allFixtures = yield* sql<{ id: number }>`SELECT id FROM fixtures`;
      return {
        fixtures,
        allFixtureIds: allFixtures.map((row) => String(row.id)),
        streamIds: streams.map((row) => row.streamId),
      };
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir(), `${saveId}.sqlite`), readonly: true })),
      Effect.scoped,
    );

  return {
    loadSeasonStreamEvents,
    loadFirstClubId,
    createCareerFrom,
    createCareerFromWorldSeed,
    withSaveWrite,
    loadResolvedFixtures,
    playUntilSeason,
    loadFields,
    survivingSeason,
  } as const;
};
