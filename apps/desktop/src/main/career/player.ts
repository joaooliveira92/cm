import {
  ClubSummary,
  PlayerContractView,
  PlayerNotFoundError,
  PlayerProfileView,
  PlayerPositionView,
  type PositionSchema,
  type FamiliarityTierSchema,
  type ClubId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { ALL_ATTRIBUTES, HIDDEN_ATTRIBUTES, POSITIONS, ageOn, overallRating as computeOverallRating, positionRating, type PlayerAttributes } from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { CURRENT_SEASON_NUMBER_SQL, loadGameDate } from "../season/currentSeason.js";

const attributeSelectList = [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map(
  (attribute) => `${attribute.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)} as "${attribute}"`,
).join(", ");

interface PlayerRow {
  readonly id: PlayerId;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly nationality: string;
  readonly birthCityName: string | null;
  readonly clubId: ClubId | null;
  readonly clubName: string | null;
  readonly statureTier: string | null;
  readonly condition: number;
  readonly injuryStatus: string;
  readonly wage: number | null;
  readonly yearsRemaining: number | null;
  readonly signedSeason: number | null;
  [attribute: string]: unknown;
}

export const getPlayerProfile = (savesDir: string, saveId: SaveId, playerId: PlayerId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readPlayerProfile(playerId).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readPlayerProfile = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;

    const rows = yield* sql.unsafe<PlayerRow>(
      `SELECT p.id, p.first_name as "firstName", p.last_name as "lastName",
              p.date_of_birth as "dateOfBirth", ${attributeSelectList},
              p.nationality as "nationality", bc.name as "birthCityName",
              c.id as "clubId", c.stature_tier as "statureTier",
              COALESCE(pf.condition, 100) as "condition",
              COALESCE(pf.last_injury_severity, 'none') as "injuryStatus",
              ct.wage as "wage", ct.years_remaining as "yearsRemaining",
              ct.signed_season as "signedSeason"
       FROM players p
       LEFT JOIN cities bc ON bc.id = p.birth_city_id
       LEFT JOIN clubs c ON c.id = p.club_id
       LEFT JOIN player_fitness pf ON pf.player_id = p.id
         AND pf.season_number = ${CURRENT_SEASON_NUMBER_SQL}
       LEFT JOIN contracts ct ON ct.player_id = p.id
       WHERE p.id = ?`,
      [playerId],
    );

    const player = rows[0];
    if (!player) {
      return yield* new PlayerNotFoundError({ playerId });
    }

    // Typed as the domain literals rather than bare strings: `player_positions` is our own schema
    // with constrained values, and naming them here keeps the assertion at the row boundary instead
    // of casting it away at each use.
    const positionRows = yield* sql.unsafe<{
      position: Schema.Schema.Type<typeof PositionSchema>;
      familiarity: Schema.Schema.Type<typeof FamiliarityTierSchema>;
    }>(`SELECT position, familiarity FROM player_positions WHERE player_id = ?`, [playerId]);

    const attributes = Object.fromEntries(
      [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map((attribute) => [attribute, player[attribute] ?? undefined]),
    ) as PlayerAttributes;

    const positions = positionRows.map(
      (r) => new PlayerPositionView({ position: r.position, familiarity: r.familiarity }),
    );

    const playerAge = ageOn(player.dateOfBirth, yield* loadGameDate);
    const posRatings: Record<string, number> = {};
    for (const pos of POSITIONS) {
      posRatings[pos] = positionRating(attributes, pos);
    }
    const ovr = computeOverallRating(attributes, positions);

    const injuryStatus = player.condition < 75
      ? "knock"
      : player.injuryStatus !== "none"
      ? player.injuryStatus
      : "fit";

    if (!player.clubId) {
      return yield* new PlayerNotFoundError({ playerId });
    }

    const clubSummary = yield* Schema.decodeUnknownEffect(ClubSummary)(
      { id: player.clubId, name: nameOf(player.clubId), statureTier: player.statureTier ?? "mid" },
    );

    return new PlayerProfileView({
      id: playerId,
      firstName: player.firstName,
      lastName: player.lastName,
      age: playerAge,
      nationality: player.nationality,
      birthplace: player.birthCityName,
      positions,
      attributes,
      overallRating: ovr,
      transferValue: 0,
      club: clubSummary,
      contractExpiry: player.yearsRemaining != null ? `${player.yearsRemaining} years` : "Free Agent",
      injuryStatus,
    });
  });

export const getPlayerContract = (savesDir: string, saveId: SaveId, playerId: PlayerId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readPlayerContract(playerId).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readPlayerContract = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const rows = yield* sql.unsafe<{
      wage: number;
      yearsRemaining: number;
      signedSeason: number;
      playerClubId: string | null;
    }>(`SELECT ct.wage, ct.years_remaining as "yearsRemaining", ct.signed_season as "signedSeason", p.club_id as "playerClubId"
         FROM contracts ct
         JOIN players p ON p.id = ct.player_id
         WHERE ct.player_id = ?`, [playerId]);

    const contract = rows[0];
    if (!contract) {
      return yield* new PlayerNotFoundError({ playerId });
    }

    return new PlayerContractView({
      playerId,
      clubId: contract.playerClubId as ClubId,
      wage: contract.wage,
      lengthYears: contract.yearsRemaining,
      startDate: `Season ${contract.signedSeason}`,
      expiryDate: `Season ${contract.signedSeason + contract.yearsRemaining}`,
    });
  });