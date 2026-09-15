import { ClubSelectionDetail, ClubSelectionRow, ClubSelectionTopPlayer, ClubSelectionView, type ClubId, type CompetitionId } from "@cm-clone/contracts";
import { BOARD_OBJECTIVE_BANDS, POSITIONS, computeSquadQuality, type Position } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { clubBadgeResolver, clubColourResolver, displayNames } from "../world/displayNames.js";
import { loadSquadPlayers } from "../club/squad.js";

const CURRENT_SEASON = 1;
const TOP_PLAYER_COUNT = 5;

export interface SquadReadoutPlayer {
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly overallRating: number;
  readonly positions: ReadonlyArray<{ readonly position: Position }>;
  readonly positionRatings: Readonly<Record<string, number>>;
}

export const strongestPosition = (player: SquadReadoutPlayer): Position => {
  const held = player.positions.map((p) => p.position);
  const candidates: ReadonlyArray<Position> = held.length > 0 ? held : POSITIONS;
  let best = candidates[0]!;
  for (const position of candidates) {
    if ((player.positionRatings[position] ?? 0) > (player.positionRatings[best] ?? 0)) best = position;
  }
  return best;
};

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
 * Load the club selection data for a provisional save. Reads all clubs across all leagues the
 * player selected, with their budgets and squad quality. Returns the full list of leagues so the
 * renderer can let the player switch between them.
 */
export const getClubSelection = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const nameOf = yield* displayNames;
  const badgeOf = yield* clubBadgeResolver;
  const coloursOf = yield* clubColourResolver;

  // All leagues the player selected (full-sim leagues), ordered by tier.
  const leagueRows = yield* sql<{ id: CompetitionId }>`
    SELECT id FROM competitions WHERE depth = 'full' AND kind = 'league' ORDER BY tier, id`;

  const budgetRows = yield* sql<{
    clubId: string;
    transferBudget: number;
    wageBudget: number;
  }>`SELECT club_id as "clubId", transfer_budget_remaining as "transferBudget",
            wage_budget as "wageBudget"
     FROM club_budgets WHERE season_number = 1`;

  const clubs: Array<InstanceType<typeof ClubSelectionRow>> = [];
  const leagues: Array<{ leagueId: CompetitionId; leagueName: string }> = [];

  for (const league of leagueRows) {
    leagues.push({ leagueId: league.id, leagueName: nameOf(league.id) });

const clubRows = yield* sql<{
    id: ClubId;
    statureTier: "big" | "mid" | "small";
  }>`SELECT c.id, c.stature_tier as "statureTier"
       FROM clubs c
       JOIN competition_participants p ON p.club_id = c.id
       WHERE p.competition_id = ${league.id} AND p.season_number = ${CURRENT_SEASON}
       ORDER BY c.id`;

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
        leagueId: league.id,
        badgeKey: badgeOf(club.id),
        clubColours: coloursOf(club.id),
        statureTier: club.statureTier,
        boardObjectiveMin: boardBand.minPosition,
        boardObjectiveMax: boardBand.maxPosition,
        squadQualityBand: sq.band,
        transferBudget: budget?.transferBudget ?? 0,
        wageBudget: budget?.wageBudget ?? 0,
        detail: summarizeSquad(squad),
      }));
    }
  }

  return new ClubSelectionView({
    clubs,
    leagues,
  });
});