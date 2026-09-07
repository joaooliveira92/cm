import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import {
  ClubId,
  ClubStaffView,
  NationId,
  NationSelectionIntentPayload,
  SaveId,
  ScopeOptionId,
} from "@cm-clone/contracts";
import {
  NAME_POOLS,
  SCOUT_HEADCOUNT,
  STAFF_DEPARTMENTS,
  nationCodeFromId,
  type NationCode,
  type StaffDepartment,
  type StatureTier,
} from "@cm-clone/shared";
import { beginCareer, commitCareer, createSave } from "../../../src/main/world/index.js";
import { getClubStaff, materialiseStaff } from "../../../src/main/career/index.js";
import { getScouting } from "../../../src/main/club/index.js";
import { createDefaultSnapshot, createSnapshotFor } from "../snapshot-helpers.js";

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

// ---------------------------------------------------------------------------
// getClubStaff — the club-scoped read (Screen 38)
// ---------------------------------------------------------------------------

/** The club the human manages, read from its row — the same query every career screen runs. */
const userClubId = () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
    return rows[0]!.id;
  });

const statureTierOf = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ statureTier: StatureTier }>`
      SELECT stature_tier as "statureTier" FROM clubs WHERE id = ${clubId}`;
    return rows[0]!.statureTier;
  });

/** The club's nation — the same season-1 competition join `loadClubIdentity` runs, whose pool the
 *  backroom's names draw from. */
const nationOf = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ nationId: string | null }>`
      SELECT comp.nation_id as "nationId"
      FROM clubs c
      JOIN competition_participants p ON p.club_id = c.id AND p.season_number = 1
      JOIN competitions comp ON comp.id = p.competition_id
      WHERE c.id = ${clubId}`;
    return rows[0]?.nationId ?? null;
  });

const staffCountFor = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ count: number }>`SELECT COUNT(*) as "count" FROM staff WHERE club_id = ${clubId}`;
    return rows[0]!.count;
  });

/** Four department groups in the derivation's fixed order, each holding exactly the roles it owns —
 *  one president, one coach, the tier's scouts, one physio. Any of the four being absent, doubled,
 *  or out of order fails the shape the Club Staff screen promises. */
const expectStaffViewOf = (view: ClubStaffView, tier: StatureTier): void => {
  expect(view.groups.map((group) => group.department)).toEqual([...STAFF_DEPARTMENTS]);
  const roleOf = (department: StaffDepartment) =>
    view.groups.find((group) => group.department === department)!.members.map((member) => member.role);
  expect(roleOf("executive")).toEqual(["president"]);
  expect(roleOf("coaching")).toEqual(["coach"]); // exactly one derived coach
  expect(roleOf("recruitment")).toEqual(Array.from({ length: SCOUT_HEADCOUNT[tier] }, () => "scout"));
  expect(roleOf("medical")).toEqual(["physio"]);
};

/** Every person's names come from the club nation's pool — staff precedent, no foreign draw. */
const expectNamesDrawnFrom = (view: ClubStaffView, nationCode: NationCode): void => {
  const pool = NAME_POOLS[nationCode];
  for (const group of view.groups) {
    for (const member of group.members) {
      expect(pool.givenNames).toContain(member.firstName);
      expect(pool.surnames).toContain(member.lastName);
    }
  }
};

const intent = (nationId: string, scopeOptionId: string, mode: "playable" | "background" | "view_only") =>
  new NationSelectionIntentPayload({
    nationId: NationId.make(nationId),
    mode,
    scopeOptionId: ScopeOptionId.make(scopeOptionId),
    source: "user",
  });

describe("getClubStaff — the club-scoped read (Screen 38)", () => {
  it.effect("names the same coach the scouting screen reads, one person, one derivation", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Career");
      const clubId = yield* inSave(save.id, userClubId());

      const staff = yield* getClubStaff(savesDir, save.id, clubId);
      const coaching = staff.groups.find((group) => group.department === "coaching")!;
      expect(coaching.members).toHaveLength(1);
      const coach = coaching.members[0]!;

      // The scouting screen reads its names from the `staff` table (`s.name`), and the materialiser
      // wrote those rows from the very `generateStaff` stream `getClubStaff` re-derives on read. A
      // coach who differed here would be a different person than the one who drives development there.
      const rows = yield* inSave(save.id, readStaff);
      const coachRow = rows.find((person) => person.role === "coach" && person.clubId === clubId);
      expect(`${coach.firstName} ${coach.lastName}`).toBe(coachRow!.name);

      // And the derived scouts are the same people the scouting screen names, name for name.
      const recruitment = staff.groups.find((group) => group.department === "recruitment")!;
      const board = yield* getScouting(savesDir, save.id);
      expect(
        new Set(recruitment.members.map((person) => `${person.firstName} ${person.lastName}`)),
      ).toEqual(new Set(board.scouts.map((scout) => scout.scoutName)));
    }),
    60_000,
  );

  it.effect("returns the human club's four people grouped, named from its nation's pool, as valid instances", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Career");
      const clubId = yield* inSave(save.id, userClubId());
      const tier = yield* inSave(save.id, statureTierOf(clubId));

      const staff = yield* getClubStaff(savesDir, save.id, clubId);
      expect(staff.club.id).toBe(clubId);
      expect(staff.club.statureTier).toBe(tier);
      expectStaffViewOf(staff, tier);

      // The handler returns real instances: every role and department in the view survives a full
      // encode/decode through the wire schema (the schema's own round-trip is a contracts test).
      const encoded = yield* Schema.encodeEffect(ClubStaffView)(staff);
      const roundTripped = yield* Schema.encodeEffect(ClubStaffView)(
        yield* Schema.decodeEffect(ClubStaffView)(encoded),
      );
      expect(roundTripped).toEqual(encoded);

      // England is the default career, and the whole backroom draws from England's pool.
      const nationId = yield* inSave(save.id, nationOf(clubId));
      expect(nationCodeFromId(nationId ?? "nation_no_such")).toBe("ENG");
      expectNamesDrawnFrom(staff, "ENG");
    }),
    60_000,
  );

  it.effect("answers for a results-only club — no staff rows, no squad — like any other", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createSnapshotFor(savesDir, [
        intent("nation_eng", "scope_eng_top", "playable"),
        intent("nation_deu", "scope_deu_top", "view_only"),
      ]);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 5150,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });
      const clubId = ClubId.make("club_deu_1_01");

      // This is a results-only club on disk: its division answers nothing — no player rows, and the
      // `staff` table holds nothing (rows exist only for a club that is or has been human-managed).
      const { depth, playersCount, tier } = yield* inSave(
        id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const playerRows = yield* sql<{ count: number }>`
            SELECT COUNT(*) as "count" FROM players WHERE club_id = ${clubId}`;
          const depths = yield* sql<{ depth: string }>`
            SELECT comp.depth FROM competitions comp
            JOIN competition_participants p ON p.competition_id = comp.id
            WHERE p.club_id = ${clubId} AND p.season_number = 1`;
          const tiers = yield* sql<{ statureTier: StatureTier }>`
            SELECT stature_tier as "statureTier" FROM clubs WHERE id = ${clubId}`;
          return {
            depth: depths[0]!.depth,
            playersCount: playerRows[0]!.count,
            tier: tiers[0]!.statureTier,
          };
        }),
      );
      expect(depth).toBe("results-only");
      expect(yield* inSave(id, staffCountFor(clubId))).toBe(0);
      expect(playersCount).toBe(0);

      // Yet the read answers with the same four people, named from Germany's pool.
      const staff = yield* getClubStaff(savesDir, id, clubId);
      expectStaffViewOf(staff, tier);
      expectNamesDrawnFrom(staff, "DEU");
    }),
    60_000,
  );

  it.effect("has exactly two failures: an unknown club, and a missing save", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Career");

      const unknownClub = yield* Effect.flip(
        getClubStaff(savesDir, save.id, ClubId.make("club_nobody")),
      );
      expect((unknownClub as { readonly _tag: string })._tag).toBe("ClubNotFoundError");

      const missingSave = yield* Effect.flip(
        getClubStaff(savesDir, SaveId.make("save_nobody"), ClubId.make("club_eng_1_01")),
      );
      expect((missingSave as { readonly _tag: string })._tag).toBe("SaveNotFoundError");
    }),
    60_000,
  );
});
