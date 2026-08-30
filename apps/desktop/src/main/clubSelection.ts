import { ClubSelectionRow, ClubSelectionView, type ClubId } from "@cm-clone/contracts";
import { BOARD_OBJECTIVE_BANDS, computeSquadQuality } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadSquadPlayers } from "./squad.js";

/**
 * Load the club selection data for a provisional save. Reads all 20 clubs with their budgets
 * and computes Squad Quality from the generated squads. Used by the creation flow's club
 * selection step (ticket 04).
 *
 * Squad Quality is expected to always succeed (every generated squad has 25 players). If it
 * fails, the generation invariant is violated and the error is fatal.
 */
export const getClubSelection = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const clubRows = yield* sql<{
    id: ClubId;
    name: string;
    statureTier: "big" | "mid" | "small";
  }>`SELECT c.id, c.name, c.stature_tier as "statureTier"
     FROM clubs c ORDER BY c.id`;

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
      clubName: club.name,
      statureTier: club.statureTier,
      boardObjectiveMin: boardBand.minPosition,
      boardObjectiveMax: boardBand.maxPosition,
      squadQualityBand: sq.band,
      transferBudget: budget?.transferBudget ?? 0,
      wageBudget: budget?.wageBudget ?? 0,
    }));
  }

  return new ClubSelectionView({ clubs });
});