import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  ManagerArchetypeSchema,
  ManagerProfileNotFoundError,
  ManagerProfileScreenView,
  ManagerProfileView,
  type SaveId,
} from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { loadManagerStatus } from "./managerStatus.js";
import { clubColourResolver } from "../world/displayNames.js";
import { loadUserClub } from "../club/squad.js";
import { loadSeasonNumbersDesc } from "../season/currentSeason.js";

/** Read the manager_profile row for the current save. Returns null if no profile exists. */
export const loadManagerProfile = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    managerName: string;
    archetypeOrigin: string;
    tacticalAcumen: number;
    influence: number;
    regimen: number;
    technicalCoaching: number;
  }>`SELECT manager_name as "managerName", archetype_origin as "archetypeOrigin",
            tactical_acumen as "tacticalAcumen", influence,
            regimen, technical_coaching as "technicalCoaching"
     FROM manager_profile WHERE id = 1`;
  return rows[0]
    ? {
        managerName: rows[0].managerName,
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
  return new ManagerProfileView({
    managerName: profile.managerName,
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
      const seasonRows = yield* loadSeasonNumbersDesc;
      const managerStatus = yield* loadManagerStatus;

      return new ManagerProfileScreenView({
        profile,
        clubName: club.name,
        clubColours: coloursOf(club.id),
        seasonNumber: seasonRows[0]?.seasonNumber ?? 1,
        tenureSeasons: seasonRows.length,
        archived: managerStatus.archivedCause !== null,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
