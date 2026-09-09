import { randomUUID } from "node:crypto";
import {
  ClubNotFoundError,
  ClubStaffDepartmentGroupView,
  ClubStaffMemberView,
  ClubStaffView,
  ClubSummary,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  createSeededRng,
  deriveClubStaff,
  deriveId,
  derivePresenceStaff,
  deriveSeed,
  generateStaff,
  nationCodeFromId,
  type StatureTier,
} from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";

/**
 * A club's Stature Tier and first-season competition's nation id, or `null` when the id names no
 * club in this save.
 *
 * The join is the same one everywhere a club's backroom is derived or materialised — the nation is
 * where the name pool comes from, and for a world-generated club it is always Season 1's
 * competition — so this single row read is shared by `materialiseStaff` (which dies on a missing
 * club, because committing a career already proved it exists) and `getClubStaff` (which turns the
 * same absence into the read's one typed failure, `ClubNotFoundError`). Two copies of the join
 * would drift apart.
 */
const loadClubIdentity = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{
      statureTier: StatureTier;
      nationId: string | null;
      isUserClub: number;
    }>`SELECT c.stature_tier as "statureTier", comp.nation_id as "nationId",
              c.is_user_club as "isUserClub"
       FROM clubs c
       JOIN competition_participants p ON p.club_id = c.id AND p.season_number = 1
       JOIN competitions comp ON comp.id = p.competition_id
       WHERE c.id = ${clubId}`;
    return clubRows[0] ?? null;
  });

/**
 * The human club's backroom, materialised the moment the club becomes human-managed.
 *
 * Written here rather than at world generation because staff exist only for a club someone manages,
 * so generating them for every club would be storing values nothing reads — and it keeps world
 * generation's cost untouched however large the selected world is.
 *
 * The rows are a deterministic function of the world seed and the club's canonical id, so the
 * backroom a manager finds is the same whether they take the club at save creation or five seasons
 * after a sacking. Nothing about arrival time or career history enters the derivation.
 */
export const materialiseStaff = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const club = yield* loadClubIdentity(clubId);
    if (club === null) {
      return yield* Effect.die(new Error(`no club to staff: ${clubId}`));
    }

    // A club generated into a cross-border competition has no nation to draw names from, which
    // generation cannot currently produce — a continental tournament owns no clubs. Dying rather
    // than inventing a fallback keeps that a defect rather than a silently English backroom.
    const nationCode = club.nationId === null ? null : nationCodeFromId(club.nationId);
    if (nationCode === null) {
      return yield* Effect.die(new Error(`club ${clubId} has no nation to draw staff from`));
    }

    const { worldSeed } = yield* readWorldSeed;
    const staff = generateStaff({
      statureTier: club.statureTier,
      clubNation: nationCode,
      random: createSeededRng(deriveSeed(worldSeed, "staff", clubId)),
    });

    for (const [index, person] of staff.entries()) {
      // Keyed on the club and the person's index within its backroom, so re-deriving after the
      // manager leaves and returns produces the same ids as well as the same people.
      const id = deriveId(worldSeed, "staff", `${clubId}:${index}`);
      yield* sql`INSERT INTO staff (id, club_id, role, quality, name)
        VALUES (${id}, ${clubId}, ${person.role}, ${person.quality}, ${`${person.firstName} ${person.lastName}`})`;
    }
  });

/** The world seed, read from the manifest. Staff derive from it like every other generated thing. */
const readWorldSeed = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    worldSeed: number;
  }>`SELECT world_seed as "worldSeed" FROM generation_manifest WHERE id = 1`;
  const manifest = rows[0];
  if (!manifest) {
    return yield* Effect.die(new Error("save has no generation_manifest row"));
  }
  return manifest;
});

/**
 * The President's full name, derived for the board-news voice.
 *
 * The board-news copy table speaks as the President for `ManagerWarned` and `ManagerSacked`, and
 * takes the name as a fact rather than deriving it — the news query resolves it here, on the same
 * reads `readClubStaff` makes (club identity for the nation, then the world seed), so the
 * club-to-nation join keeps its one home. The President is a pure function of `(clubId, nation,
 * worldSeed)`, so every read of the same save names the same person, and a message projected years
 * after the event that warned the manager re-reads the same name the day it was warned with.
 */
export const loadPresidentName = (clubId: ClubId) =>
  Effect.gen(function* () {
    const club = yield* loadClubIdentity(clubId);
    if (club === null) {
      return yield* Effect.die(new Error(`no club to name a president for: ${clubId}`));
    }
    const nationCode = club.nationId === null ? null : nationCodeFromId(club.nationId);
    if (nationCode === null) {
      return yield* Effect.die(new Error(`club ${clubId} has no nation to draw a president from`));
    }

    const { worldSeed } = yield* readWorldSeed;
    const president = derivePresenceStaff({ clubId, clubNation: nationCode, worldSeed })[0];
    if (president === undefined) {
      return yield* Effect.die(new Error(`presence derivation produced no president for ${clubId}`));
    }
    return `${president.firstName} ${president.lastName}`;
  });

/**
 * Club Staff (Screen 38): who works at any club in the save, grouped by department.
 *
 * Every person is derived on read from the world seed, the club's Stature Tier, and its nation —
 * never read from the `staff` table — so the bound two are re-derived exactly as `materialiseStaff`
 * writes them and agree with the rows by construction, and a `results-only` club with no rows at all
 * answers like any other. A pure query: the save being missing is `SaveNotFoundError`, a club id
 * naming nothing in that save is `ClubNotFoundError`, and nothing is written.
 */
export const getClubStaff = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readClubStaff(clubId).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readClubStaff = (clubId: ClubId) =>
  Effect.gen(function* () {
    const club = yield* loadClubIdentity(clubId);
    if (club === null) {
      return yield* new ClubNotFoundError({ id: clubId });
    }

    // The same cross-border defect the materialiser dies on: a generated club always has a nation
    // to draw names from, and inventing a fallback here would silently change a name pool.
    const nationCode = club.nationId === null ? null : nationCodeFromId(club.nationId);
    if (nationCode === null) {
      return yield* Effect.die(new Error(`club ${clubId} has no nation to draw staff from`));
    }

    const { worldSeed } = yield* readWorldSeed;
    const groups = deriveClubStaff({
      clubId,
      statureTier: club.statureTier,
      clubNation: nationCode,
      worldSeed,
    });
    const nameOf = yield* displayNames;
    const summary = new ClubSummary({
      id: clubId,
      name: nameOf(clubId),
      statureTier: club.statureTier,
    });

    return new ClubStaffView({
      club: summary,
      // SQLite has no boolean: the column is the integer flag world generation writes.
      isUserClub: club.isUserClub === 1,
      groups: groups.map(
        (group) =>
          new ClubStaffDepartmentGroupView({
            department: group.department,
            members: group.members.map(
              (person) =>
                new ClubStaffMemberView({
                  role: person.role,
                  firstName: person.firstName,
                  lastName: person.lastName,
                }),
            ),
          }),
      ),
    });
  });

/** The coach's quality at a club, or `null` where nobody manages it — every AI club. */
export const loadCoachQuality = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      quality: number;
    }>`SELECT quality FROM staff WHERE club_id = ${clubId} AND role = 'coach' LIMIT 1`;
    return rows[0]?.quality ?? null;
  });

/** Unused today; kept so the id mint above has one obvious home if staff ever gain a surrogate. */
export const freshStaffId = (): string => randomUUID();
