import { readdir } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { ClubSummary, SaveNotFoundError, SquadPlayerView, SquadView, type SaveId, type ClubId, type PlayerId } from "@cm-clone/contracts";
import {
  positionSummaryOf,
  ALL_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  ageOn,
  nationName,
  fitRatingsByPosition,
  fitRatingsByCell,
  suitabilityByCellOf,
  overallRatingOverCells,
  projectLegacyPositions,
  seasonEndDate,
  transferValue,
  type Category,
  type PlayerAttributes,
  type RetrainingTarget,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "../world/displayNames.js";
import { positionalRatingSelectList, positionalRatingsOf, type PositionalRatingRow } from "../world/positionalRatingColumns.js";
import { CURRENT_SEASON_NUMBER_SQL, loadGameDate } from "../season/currentSeason.js";

interface PlayerRow extends PositionalRatingRow {
  readonly id: PlayerId;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly condition: number;
  readonly trainingFocus: string | null;
  readonly retrainingTarget: string | null;
  readonly nationality: string;
  readonly birthplace: string | null;
  /** SQLite's boolean: 1 when the player's nation is not the club's. */
  readonly foreign: number;
  readonly potentialAbility: number;
  /** `null` when the player has no active Contract. */
  readonly contractWage: number | null;
  /** The last Season the Contract covers, `null` with no active Contract. */
  readonly lastSeason: number | null;
  readonly referenceYear: number;
  readonly [attribute: string]: unknown;
}

/** Every attribute column to SELECT. Hidden attributes (injury proneness) are included even though
 * the UI never renders them — the match engine reads them from `player.attributes` when it builds a
 * team setup, so they must be present in the read model. */
const attributeSelectList = [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map(
  (attribute) => `${attribute.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)} as "${attribute}"`,
).join(", ");

/** The user's club — assumes the caller already has a `SqlClient` for the save's SQLite file in
 *  context. The name is the pack's, resolved through the `displayNames` seam; no read path takes a
 *  club name from a column. */
export const loadUserClub = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const nameOf = yield* displayNames;
  const clubRows = yield* sql<{
    id: ClubId;
    statureTier: "big" | "mid" | "small";
  }>`SELECT id, stature_tier as "statureTier" FROM clubs WHERE is_user_club = 1 LIMIT 1`;
  const row = clubRows[0];
  return yield* Schema.decodeUnknownEffect(ClubSummary)(
    row === undefined ? row : { ...row, name: nameOf(row.id) },
  );
});

/** A club's squad, ratings included — assumes the caller already has a `SqlClient` for the save's SQLite file in context.
 *  Each age is measured on the game date (`loadGameDate`), never on the machine's clock. */
export const loadSquadPlayers = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const gameDate = yield* loadGameDate;

    const playerRows = yield* sql.unsafe<PlayerRow>(
      `SELECT p.id, p.first_name as "firstName", p.last_name as "lastName", p.date_of_birth as "dateOfBirth", ${attributeSelectList},
              ${positionalRatingSelectList("p.")},
              COALESCE(pf.condition, 100) as "condition", tf.focus as "trainingFocus", rt.target as "retrainingTarget",
              p.nationality as "nationality", bc.name as "birthplace",
              p.nationality <> cc.nation_id as "foreign",
              p.potential_ability as "potentialAbility", ct.wage as "contractWage",
              -- SeasonConcluded decrements years_remaining and frees the player at zero, so a
              -- Contract with n years left covers this Season and the n - 1 after it.
              COALESCE(${CURRENT_SEASON_NUMBER_SQL}, 1) + ct.years_remaining - 1 as "lastSeason",
              (SELECT reference_year FROM generation_manifest WHERE id = 1) as "referenceYear"
       FROM players p
       -- A club's nation is its home city's; there is no nation column on clubs.
       JOIN clubs c ON c.id = p.club_id
       JOIN cities cc ON cc.id = c.city_id
       LEFT JOIN player_fitness pf ON pf.player_id = p.id
         AND pf.season_number = ${CURRENT_SEASON_NUMBER_SQL}
       LEFT JOIN training_focus tf ON tf.player_id = p.id
       LEFT JOIN retraining_targets rt ON rt.player_id = p.id
       -- Real geography, so the city's name is read straight off the row. Only club and
       -- competition names go through the content pack.
       LEFT JOIN cities bc ON bc.id = p.birth_city_id
       LEFT JOIN contracts ct ON ct.player_id = p.id
       WHERE p.club_id = ?`,
      [clubId],
    );

    return playerRows.map((row) => {
      const ratings = positionalRatingsOf(row);
      // Transitional: the ten-Position list readers still expect, derived from the stored ratings.
      const positions = projectLegacyPositions(ratings);

      const attributes = Object.fromEntries(
        [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map((attribute) => [attribute, row[attribute] ?? undefined]),
      ) as PlayerAttributes;

      const overall = overallRatingOverCells(attributes, ratings);
      const age = ageOn(row.dateOfBirth, gameDate);
      // Fit-adjusted: Best XI, squad quality and the AI's squad-gap check all read this map, and
      // each should prefer the player who can actually play there.
      const positionRatings = fitRatingsByPosition(attributes, ratings);

      return new SquadPlayerView({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        age,
        attributes,
        positions: positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
        overallRating: overall,
        positionRatings,
        cellRatings: fitRatingsByCell(attributes, ratings),
        suitability: suitabilityByCellOf(ratings),
        ...positionSummaryOf(ratings),
        condition: row.condition,
        trainingFocus: (row.trainingFocus as Category | null) ?? null,
        retrainingTarget: (row.retrainingTarget as RetrainingTarget | null) ?? null,
        nationality: nationName(row.nationality),
        birthplace: row.birthplace,
        foreign: row.foreign === 1,
        contractWage: row.contractWage,
        contractExpiryDate:
          row.lastSeason === null ? null : seasonEndDate(row.referenceYear, row.lastSeason),
        transferValue: transferValue(overall, age, row.potentialAbility),
      });
    });
  });

export const getSquad = (savesDir: string, saveId: SaveId) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      readdir(savesDir).then((entries) => entries.includes(`${saveId}.sqlite`)),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }

    return yield* Effect.gen(function* () {
      const club = yield* loadUserClub;
      const players = yield* loadSquadPlayers(club.id);
      return new SquadView({ club, players });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped);
  });
