/**
 * Player Transfer Target Comparison (Screen 129) — the manager puts two or more players — searched
 * or shortlisted targets — side by side and compares them across position/role fit, visible
 * Attributes, Overall Rating, Transfer Value, wage, contract and availability.
 *
 * Each column is one named player, read by the human club's Scouting Progress on him under the
 * shared knowledge rule (Agent Note 2026-09-19, tickets 09-12): the manager's own squad always
 * exact, a rival or a Free Agent an Attribute Range below Fully Scouted, for every visible
 * Attribute, Overall Rating and Transfer Value, so the comparison never publishes a figure the
 * search or Profile would withhold. `wage`, `contractExpiry` and `injuryStatus` are contract and
 * fitness facts, not market readings, so they are always exact — the Profile and contract reads
 * share the same derivations (`injuryStatusOf`), so the two screens cannot disagree about a fact.
 *
 * The pool is `loadAllPlayersEcon`, the same whole-save, club-agnostic read the market, the search
 * and the AI clubs use; contracts and fitness are read in two batched `IN` queries because the
 * whole pool's contract/fitness tables belong to no single screen read the way `players` does.
 */
import {
  PlayerComparisonView,
  PlayerComparisonRowView,
  PlayerNotFoundError,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { ALL_ATTRIBUTES, FULLY_SCOUTED, figureByProgress, transferValueFigureByProgress } from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { injuryStatusOf } from "../career/player.js";
import { loadUserClub } from "../club/squad.js";
import { withExistingSave } from "../season/decider.js";
import { CURRENT_SEASON_NUMBER_SQL, loadSeasonRow } from "../season/currentSeason.js";
import { loadAllPlayersEcon, type PlayerEcon } from "./economics.js";

export const getPlayerComparison = (
  savesDir: string,
  saveId: SaveId,
  playerIds: ReadonlyArray<PlayerId>,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readPlayerComparison(playerIds).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readPlayerComparison = (playerIds: ReadonlyArray<PlayerId>) =>
  Effect.gen(function* () {
    // Comparing nothing is an empty table, not a read of the whole save's contract ledger.
    if (playerIds.length === 0) return new PlayerComparisonView({ rows: [] });

    const sql = yield* SqlClient;
    const seasonRow = yield* loadSeasonRow;
    const players = yield* loadAllPlayersEcon(seasonRow.currentDate);
    const playerById = new Map(players.map((player) => [String(player.id), player]));

    const humanClub = yield* loadUserClub;
    const progressRows = yield* sql<{ playerId: PlayerId; progress: number }>`
      SELECT sp.player_id as "playerId", sp.progress
      FROM scouting_progress sp
      WHERE sp.club_id = ${humanClub.id}`;
    const progressOf = new Map(progressRows.map((row) => [String(row.playerId), row.progress]));

    // Contract and fitness are read once for the whole chosen set, not once per player: the set is
    // a handful of names but the queries must not multiply with it (the search loads the whole
    // progress table once for the same reason).
    const contractRows = yield* sql.unsafe<{
      playerId: PlayerId;
      wage: number;
      yearsRemaining: number;
    }>(`SELECT ct.player_id as "playerId", ct.wage, ct.years_remaining as "yearsRemaining"
        FROM contracts ct WHERE ct.player_id IN (${playerIds.map(() => "?").join(",")})`,
      [...playerIds],
    );
    const fitnessRows = yield* sql.unsafe<{
      playerId: PlayerId;
      condition: number;
      severity: string;
    }>(`SELECT pf.player_id as "playerId", pf.condition, pf.last_injury_severity as "severity"
        FROM player_fitness pf
        WHERE pf.season_number = ${CURRENT_SEASON_NUMBER_SQL} AND pf.player_id IN (${playerIds.map(() => "?").join(",")})`,
      [...playerIds],
    );
    const contractByPlayer = new Map(contractRows.map((row) => [String(row.playerId), row]));
    const fitnessByPlayer = new Map(fitnessRows.map((row) => [String(row.playerId), row]));

    // A named player the save does not hold is a typed failure, the same way the Profile refuses a
    // player it cannot find — the manager picked a name, so an empty column would guess at it.
    for (const playerId of playerIds) {
      if (!playerById.has(String(playerId))) {
        return yield* new PlayerNotFoundError({ playerId });
      }
    }

    return new PlayerComparisonView({
      rows: playerIds.map((playerId) => {
        const player = playerById.get(String(playerId))!;
        return toComparisonRow(player, humanClub.id, progressOf, contractByPlayer, fitnessByPlayer);
      }),
    });
  });

/** One named player, one comparison column. Same knowledge rule as the search and the Profile:
 *  exact at Fully Scouted and for own-squad players, an Attribute Range below it on every visible
 *  Attribute, Overall Rating and Transfer Value. Wage, contract and availability are exact facts,
 *  never ranged. */
const toComparisonRow = (
  player: PlayerEcon,
  humanClubId: string,
  progressOf: Map<string, number>,
  contractByPlayer: Map<string, { readonly wage: number; readonly yearsRemaining: number }>,
  fitnessByPlayer: Map<string, { readonly condition: number; readonly severity: string }>,
): PlayerComparisonRowView => {
  const progress = player.clubId === humanClubId ? FULLY_SCOUTED : (progressOf.get(String(player.id)) ?? 0);
  const contract = contractByPlayer.get(String(player.id));
  const fitness = fitnessByPlayer.get(String(player.id));
  // No fitness row for the current season reads as a fully fit player, as the profile's join does.
  const condition = fitness?.condition ?? 100;
  const severity = fitness?.severity ?? "none";

  // Visible Attributes only: the profile may carry hidden Attributes for the match engine, but this
  // read exists to draw a comparison, and no UI group renders one (Agent Note 2026-09-19).
  const attributes = Object.fromEntries(
    ALL_ATTRIBUTES.flatMap((attribute) => {
      const trueValue = player.attributes[attribute];
      return typeof trueValue === "number"
        ? [[attribute, figureByProgress(trueValue, progress, [1, 20])]]
        : [];
    }),
  );

  return new PlayerComparisonRowView({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    age: player.age,
    nationality: player.nationality,
    clubId: player.clubId,
    clubName: player.clubName,
    positions: player.positions.map((position) => ({ position: position.position, familiarity: position.familiarity })),
    attributes,
    overallRating: figureByProgress(player.overallRating, progress),
    transferValue: transferValueFigureByProgress(
      player.overallRating,
      player.age,
      player.potentialAbility,
      progress,
    ),
    // A Free Agent has no Contract, so no wage and no expiry — null, never a spare zero.
    wage: contract?.wage ?? null,
    contractExpiry: contract?.yearsRemaining != null ? `${contract.yearsRemaining} years` : "Free Agent",
    injuryStatus: injuryStatusOf(condition, severity),
  });
};