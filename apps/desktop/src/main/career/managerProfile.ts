import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  ClubId,
  ManagerArchetypeSchema,
  ManagerProfileNotFoundError,
  ManagerProfileScreenView,
  ManagerProfileView,
  NationId,
  type SaveId,
} from "@cm-clone/contracts";
import { nationName } from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { loadManagerStatus } from "./managerStatus.js";
import { clubBadgeResolver, clubColourResolver, displayNames } from "../world/displayNames.js";
import { loadUserClub } from "../club/squad.js";
import { loadSeasonNumbersDesc } from "../season/currentSeason.js";

/** Read the manager_profile row for the current save. Returns null if no profile exists. */
export const loadManagerProfile = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    firstName: string;
    lastName: string;
    nationalityId: string;
    dateOfBirth: string;
    favoriteClubId: string | null;
    archetypeOrigin: string;
    tacticalAcumen: number;
    influence: number;
    regimen: number;
    technicalCoaching: number;
  }>`SELECT first_name as "firstName", last_name as "lastName",
            nationality_id as "nationalityId", date_of_birth as "dateOfBirth",
            favorite_club_id as "favoriteClubId", archetype_origin as "archetypeOrigin",
            tactical_acumen as "tacticalAcumen", influence,
            regimen, technical_coaching as "technicalCoaching"
     FROM manager_profile WHERE id = 1`;
  return rows[0]
    ? {
        firstName: rows[0].firstName,
        lastName: rows[0].lastName,
        nationalityId: rows[0].nationalityId,
        dateOfBirth: rows[0].dateOfBirth,
        favoriteClubId: rows[0].favoriteClubId,
        archetypeOrigin: rows[0].archetypeOrigin,
        pillars: {
          tacticalAcumen: rows[0].tacticalAcumen,
          influence: rows[0].influence,
          regimen: rows[0].regimen,
          technicalCoaching: rows[0].technicalCoaching,
        },
      }
    : null;
});

/** Decode the stored `manager_profile` row into the contract view. */
const decodeProfile = Effect.gen(function* () {
  const profile = yield* loadManagerProfile;
  if (!profile) {
    return yield* new ManagerProfileNotFoundError();
  }
  // The favorite club's name is resolved through the save's content pack, the same seam every other
  // club name reads through; country names are factual geography read straight from code.
  const resolveName = yield* displayNames;
  return new ManagerProfileView({
    firstName: profile.firstName,
    lastName: profile.lastName,
    nationalityId: NationId.make(profile.nationalityId),
    nationalityName: nationName(profile.nationalityId),
    dateOfBirth: profile.dateOfBirth,
    favoriteClubId: profile.favoriteClubId === null ? null : ClubId.make(profile.favoriteClubId),
    favoriteClubName:
      profile.favoriteClubId === null ? null : resolveName(profile.favoriteClubId),
    archetypeOrigin: yield* Schema.decodeUnknownEffect(ManagerArchetypeSchema)(profile.archetypeOrigin),
    pillars: profile.pillars,
  });
});

/** Query the manager profile from a committed save. */
export const getManagerProfile = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    decodeProfile.pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/**
 * Manager Profile screen query (Screen 19): creation-time identity, plus the club, Season number and
 * tenure that frame it, plus the Archived Save flag.
 *
 * Tenure is the count of `season` rows because a save is bound to one club for its whole life (there
 * is no club-change flow), so "Seasons with this club" and "Seasons in this save" are the same
 * number. It stays correct once Season rollover lands, since rollover inserts a row per Season.
 *
 * `archived` is `manager_status.archived_cause IS NOT NULL` — both causes, Manager Sacked and
 * Manager Retired, collapse into the one flag. The badge keys off the archived state, never off the
 * cause; only player-facing copy elsewhere (Season Summary's closing line) distinguishes the two.
 */
export const getManagerProfileScreen = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const profile = yield* decodeProfile;
      const club = yield* loadUserClub;
      // Resolved here rather than carried on `ClubSummary`: the career header is the only consumer,
      // and widening a contract class shared by the squad, transfer, and match views to serve one
      // screen is an API expansion the other consumers pay for and never use.
      const coloursOf = yield* clubColourResolver;
      const badgeOf = yield* clubBadgeResolver;
      const seasonRows = yield* loadSeasonNumbersDesc;
      const managerStatus = yield* loadManagerStatus;

      return new ManagerProfileScreenView({
        profile,
        clubName: club.name,
        badgeKey: badgeOf(club.id),
        clubColours: coloursOf(club.id),
        seasonNumber: seasonRows[0]?.seasonNumber ?? 1,
        tenureSeasons: seasonRows.length,
        archived: managerStatus.archivedCause !== null,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
