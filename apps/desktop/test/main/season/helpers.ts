import path from "node:path";
import type { ClubId, SaveId, SnapshotId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { beginCareer, commitCareer } from "../../../src/main/world/index.js";
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

  return {
    loadSeasonStreamEvents,
    loadFirstClubId,
    createCareerFrom,
    createCareerFromWorldSeed,
    withSaveWrite,
  } as const;
};
