import { ClubSelectionDetail, ClubSelectionRow, ClubSelectionTopPlayer, ClubSelectionView, type ClubId } from "@cm-clone/contracts";
import { BOARD_OBJECTIVE_BANDS, POSITIONS, computeSquadQuality, type Position } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "../world/displayNames.js";
import { loadSquadPlayers } from "../club/squad.js";

/** Club selection happens before a career exists, so the world is always in its first season. */
const CURRENT_SEASON = 1;

/** How many players the detail panel's top readout carries. */
const TOP_PLAYER_COUNT = 5;

/** The subset of a squad player the detail readout reads. Structural rather than
 *  `SquadPlayerView`, so the summary is unit-testable on a hand-written fixture. */
export interface SquadReadoutPlayer {
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly overallRating: number;
  readonly positions: ReadonlyArray<{ readonly position: Position }>;
  readonly positionRatings: Readonly<Record<string, number>>;
}

/**
 * The Position a player is strongest in, chosen among the Positions they actually hold — a player's
 * `positionRatings` are computed for every Position on the pitch, so ranking over all of them would
 * name a Position they cannot play. Falls back to the best-rated Position overall for a player with
 * no assignment, which generation does not produce but the type permits.
 */
export const strongestPosition = (player: SquadReadoutPlayer): Position => {
  const held = player.positions.map((p) => p.position);
  const candidates: ReadonlyArray<Position> = held.length > 0 ? held : POSITIONS;
  let best = candidates[0]!;
  for (const position of candidates) {
    if ((player.positionRatings[position] ?? 0) > (player.positionRatings[best] ?? 0)) best = position;
  }
  return best;
};

/**
 * The detail panel's squad readout, derived from the squad the caller already loaded. Pure, so the
 * ordering and averaging rules are testable without a database: squad size and average age are the
 * subordinate figures, and the top five are the highest `overallRating` players, ties broken by
 * name so the readout is stable across reads of the same world.
 */
export const summarizeSquad = (squad: ReadonlyArray<SquadReadoutPlayer>): ClubSelectionDetail => {
  const byRating = [...squad].sort(
    (a, b) =>
      b.overallRating - a.overallRating ||
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
  );
  const averageAge =
    squad.length === 0 ? 0 : squad.reduce((total, player) => total + player.age, 0) / squad.length;

  return new ClubSelectionDetail({
    squadSize: squad.length,
    averageAge: Math.round(averageAge * 10) / 10,
    topPlayers: byRating.slice(0, TOP_PLAYER_COUNT).map(
      (player) =>
        new ClubSelectionTopPlayer({
          name: `${player.firstName} ${player.lastName}`,
          position: strongestPosition(player),
          overallRating: player.overallRating,
        }),
    ),
  });
};

/**
 * Load the club selection data for a provisional save. Reads all 20 clubs with their budgets
 * and computes Squad Quality from the generated squads. Used by the creation flow's club
 * selection step (ticket 04).
 *
 * Each row also carries the detail panel's compact squad readout, computed from the same squad
 * this handler already loads for Squad Quality: the panel fills from the first response, so
 * selecting a club costs no second call. The cost of the widening is transfer, not computation.
 *
 * Squad Quality is expected to always succeed (every generated squad has 25 players). If it
 * fails, the generation invariant is violated and the error is fatal.
 */
export const getClubSelection = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const nameOf = yield* displayNames;

  // The League the career is played in: the deepest-simulated league in the save. With one playable
  // competition today this is exactly that competition; it is read from the save rather than named
  // by a constant because the world now records which competitions it actually generated.
  const leagueRows = yield* sql<{ id: string }>`
    SELECT id FROM competitions WHERE depth = 'full' AND kind = 'league' ORDER BY tier, id LIMIT 1`;

  // The clubs of that league, through their participant rows. Membership has exactly one home and
  // this is a read of it — not "every club in the save", which was only ever right while a world
  // held one competition.
  const leagueId = leagueRows[0]?.id ?? null;
  const clubRows = yield* sql<{
    id: ClubId;
    statureTier: "big" | "mid" | "small";
  }>`SELECT c.id, c.stature_tier as "statureTier"
     FROM clubs c
     JOIN competition_participants p ON p.club_id = c.id
     WHERE p.competition_id = ${leagueId} AND p.season_number = ${CURRENT_SEASON}
     ORDER BY c.id`;

  const budgetRows = yield* sql<{
    clubId: ClubId;
    transferBudget: number;
    wageBudget: number;
  }>`SELECT club_id as "clubId", transfer_budget_remaining as "transferBudget",
            wage_budget as "wageBudget"
     FROM club_budgets WHERE season_number = 1`;

  const clubs: Array<InstanceType<typeof ClubSelectionRow>> = [];
  for (const club of clubRows) {
    const squad = yield* loadSquadPlayers(club.id);
    const sq = computeSquadQuality(squad);
    if (!sq) {
      return yield* Effect.die(new Error(`Squad too small for Squad Quality computation: club ${club.id}, squad size ${squad.length}`));
    }
    const budget = budgetRows.find((b) => b.clubId === club.id);
    const boardBand = BOARD_OBJECTIVE_BANDS[club.statureTier];

    clubs.push(new ClubSelectionRow({
      clubId: club.id,
      clubName: nameOf(club.id),
      statureTier: club.statureTier,
      boardObjectiveMin: boardBand.minPosition,
      boardObjectiveMax: boardBand.maxPosition,
      squadQualityBand: sq.band,
      transferBudget: budget?.transferBudget ?? 0,
      wageBudget: budget?.wageBudget ?? 0,
      detail: summarizeSquad(squad),
    }));
  }

  return new ClubSelectionView({
    clubs,
    leagueName: leagueId === null ? "" : nameOf(leagueId),
  });
});
