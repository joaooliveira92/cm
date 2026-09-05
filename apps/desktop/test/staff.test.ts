import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { SCOUT_HEADCOUNT, type StatureTier } from "@cm-clone/shared";
import { beginCareer, commitCareer, createSave } from "../src/main/world/index.js";
import { materialiseStaff } from "../src/main/career/index.js";
import { createDefaultSnapshot } from "./snapshot-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-staff-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const inSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>, readonly = true) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly })),
    Effect.scoped,
  );

interface StaffRow {
  readonly id: string;
  readonly clubId: string;
  readonly role: string;
  readonly quality: number;
  readonly name: string;
}

const readStaff = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<StaffRow>`SELECT id, club_id as "clubId", role, quality, name
    FROM staff ORDER BY role, id`;
});

describe("staff cost world generation nothing", () => {
  it.effect("writes no staff row for a provisional world", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 4711,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });

      // Nobody manages this world yet, so nothing reads either binding and no row exists —
      // including for the twenty clubs generation just wrote.
      expect(yield* inSave(id, readStaff)).toEqual([]);
    }),
  );

  it.effect("gives the human's club a coach and its tier's scouts, and no other club any", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");

      const { staff, userClub } = yield* inSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const clubs = yield* sql<{
            id: string;
            statureTier: StatureTier;
          }>`SELECT id, stature_tier as "statureTier" FROM clubs WHERE is_user_club = 1`;
          return { staff: yield* readStaff, userClub: clubs[0]! };
        }),
      );

      expect(staff.filter((person) => person.role === "coach")).toHaveLength(1);
      expect(staff.filter((person) => person.role === "scout")).toHaveLength(
        SCOUT_HEADCOUNT[userClub.statureTier],
      );
      // Every row belongs to the one club anybody manages.
      expect(new Set(staff.map((person) => person.clubId))).toEqual(new Set([userClub.id]));
      for (const person of staff) {
        expect(person.name.trim().length).toBeGreaterThan(0);
        expect(person.quality).toBeGreaterThanOrEqual(1);
        expect(person.quality).toBeLessThanOrEqual(20);
      }
    }),
  );
});

describe("a backroom is a property of the club, not of the visit", () => {
  it.effect("re-derives byte-identical rows when the same club is taken again", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createDefaultSnapshot(savesDir);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 8123,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });
      const clubId = "club_eng_1_04";
      yield* commitCareer(savesDir, id, "Career", clubId as never, {
        managerName: "Manager",
        archetypeOrigin: "custom",
        pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
      });

      const first = yield* inSave(id, readStaff);

      // Leaving deletes the rows; taking the club again derives the same people, because they are
      // a function of the world seed and the club's canonical id and nothing else.
      const second = yield* inSave(
        id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`DELETE FROM staff WHERE club_id = ${clubId}`;
          yield* materialiseStaff(clubId as never);
          return yield* readStaff;
        }),
        false,
      );

      expect(first.length).toBeGreaterThan(1);
      expect(second).toEqual(first);
    }),
  );

  it.effect("keeps no wage, contract, or hiring path anywhere in the schema", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");

      yield* inSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const staffColumns = yield* sql<{ name: string }>`SELECT name FROM pragma_table_info('staff')`;
          // A name, a role, a quality, a club — and nothing that makes staff a lever the manager
          // pulls. `Contract` and `Wage Budget` stay player-to-club concepts.
          expect(staffColumns.map((column) => column.name).sort()).toEqual([
            "club_id",
            "id",
            "name",
            "quality",
            "role",
          ]);

          const contractClubs = yield* sql<{ table: string }>`
            SELECT m.name as "table" FROM sqlite_master AS m
            JOIN pragma_table_info(m.name) AS p
            WHERE m.name = 'contracts' AND p.name LIKE '%staff%'`;
          expect(contractClubs).toEqual([]);
        }),
      );
    }),
  );
});
