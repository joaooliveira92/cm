import { randomUUID } from "node:crypto";
import { type ClubId } from "@cm-clone/contracts";
import {
  createSeededRng,
  deriveId,
  deriveSeed,
  generateStaff,
  nationCodeFromId,
  type StatureTier,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

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

    const clubRows = yield* sql<{
      statureTier: StatureTier;
      nationId: string | null;
    }>`SELECT c.stature_tier as "statureTier", comp.nation_id as "nationId"
       FROM clubs c
       JOIN competition_participants p ON p.club_id = c.id AND p.season_number = 1
       JOIN competitions comp ON comp.id = p.competition_id
       WHERE c.id = ${clubId}`;
    const club = clubRows[0];
    if (club === undefined) {
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
