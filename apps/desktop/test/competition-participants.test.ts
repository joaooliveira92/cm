import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { beginCareer } from "../src/main/saves.js";
import { createPyramidSnapshot, createDefaultSnapshot } from "./snapshot-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-participants-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const generate = (snapshot: Effect.Effect<string>) =>
  Effect.gen(function* () {
    const snapshotId = yield* snapshot;
    const { id } = yield* beginCareer(savesDir, {
      worldSeed: 606,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId: snapshotId as never,
    });
    return id;
  });

const inSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>, readonly = true) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly })),
    Effect.scoped,
  );

describe("membership lives on participant rows", () => {
  it.effect("writes one row per club per competition for season 1", () =>
    Effect.gen(function* () {
      const saveId = yield* generate(createPyramidSnapshot(savesDir));

      const counts = yield* inSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          // The invariant ticket 05 could only state: participant count equals the competition's
          // own `club_count`, for every league and every season. Cups are skipped — their field is
          // a function of their sources, which is why their count is NULL.
          return yield* sql<{
            competitionId: string;
            seasonNumber: number;
            declared: number;
            actual: number;
          }>`SELECT c.id as "competitionId", p.season_number as "seasonNumber",
                    c.club_count as "declared", COUNT(*) as "actual"
             FROM competitions c
             JOIN competition_participants p ON p.competition_id = c.id
             WHERE c.club_count IS NOT NULL
             GROUP BY c.id, p.season_number
             ORDER BY c.id, p.season_number`;
        }),
      );

      expect(counts.length).toBeGreaterThan(1);
      for (const row of counts) {
        expect(row.actual, `${row.competitionId} season ${row.seasonNumber}`).toBe(row.declared);
      }
    }),
  );

  it.effect("gives a club exactly one competition in a season, and no column repeats it", () =>
    Effect.gen(function* () {
      const saveId = yield* generate(createPyramidSnapshot(savesDir));

      yield* inSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const doubled = yield* sql<{ clubId: string; rows: number }>`
            SELECT club_id as "clubId", COUNT(*) as "rows"
            FROM competition_participants WHERE season_number = 1
            GROUP BY club_id HAVING COUNT(*) > 1`;
          expect(doubled).toEqual([]);

          // A club with no row is the defect the slice's edge promise names — every club in a
          // loaded competition has one from generation onward.
          const orphans = yield* sql<{ id: string }>`
            SELECT id FROM clubs
            WHERE id NOT IN (SELECT club_id FROM competition_participants WHERE season_number = 1)`;
          expect(orphans).toEqual([]);

          // And membership has one home: no column on `clubs` answers the same question.
          const columns = yield* sql<{ name: string }>`SELECT name FROM pragma_table_info('clubs')`;
          expect(columns.map((column) => column.name)).not.toContain("competition_id");
          expect(columns.some((column) => column.name.includes("competition"))).toBe(false);
        }),
      );
    }),
  );

  it.effect("keeps the standings columns empty while the season is still running", () =>
    Effect.gen(function* () {
      const saveId = yield* generate(createDefaultSnapshot(savesDir));

      const unfrozen = yield* inSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          return yield* sql<{ rows: number }>`
            SELECT COUNT(*) as "rows" FROM competition_participants
            WHERE final_position IS NOT NULL OR points IS NOT NULL
               OR goal_difference IS NOT NULL OR goals_for IS NOT NULL`;
        }),
      );
      expect(unfrozen[0]?.rows).toBe(0);
    }),
  );
});

describe("a season's outcome outlives the fixtures that produced it", () => {
  it.effect("reads a champion as the participant at final position 1, with no winner column", () =>
    Effect.gen(function* () {
      const saveId = yield* generate(createDefaultSnapshot(savesDir));

      const champion = yield* inSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          // Stand in for ticket 13's rollover: freeze one season's outcome onto the rows.
          yield* sql`UPDATE competition_participants
            SET final_position = 2, points = 60, goal_difference = 5, goals_for = 40
            WHERE competition_id = 'comp_eng_1' AND season_number = 1`;
          yield* sql`UPDATE competition_participants
            SET final_position = 1, points = 90, goal_difference = 55, goals_for = 95
            WHERE competition_id = 'comp_eng_1' AND season_number = 1 AND club_id = 'club_eng_1_07'`;

          // Every fixture the season was played through is gone. The table survives it, which is
          // the whole reason the outcome is frozen rather than left derivable from fixtures the
          // next season overwrites.
          yield* sql`DELETE FROM fixtures`;

          const rows = yield* sql<{ clubId: string; points: number }>`
            SELECT club_id as "clubId", points FROM competition_participants
            WHERE competition_id = 'comp_eng_1' AND season_number = 1 AND final_position = 1`;

          // No second answer anywhere: a champion is read, never stored.
          const tables = yield* sql<{ name: string }>`
            SELECT name FROM sqlite_master WHERE type = 'table'`;
          expect(tables.map((table) => table.name)).not.toContain("competition_seasons");
          const winnerColumns = yield* sql<{ table: string; column: string }>`
            SELECT m.name as "table", p.name as "column"
            FROM sqlite_master AS m JOIN pragma_table_info(m.name) AS p
            WHERE p.name LIKE '%winner%' OR p.name LIKE '%champion%'`;
          expect(winnerColumns).toEqual([]);

          return rows;
        }),
        false,
      );

      expect(champion).toEqual([{ clubId: "club_eng_1_07", points: 90 }]);
    }),
  );
});
