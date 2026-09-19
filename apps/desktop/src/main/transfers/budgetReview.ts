import {
  BudgetReviewView,
  type SaveId,
} from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { withExistingSave } from "../season/decider.js";
import { loadUserClub } from "../club/squad.js";
import { loadClubBudgetRow, loadWageBudgetUsed } from "./budgets.js";

/**
 * Transfer and Wage Budget Review screen (Screen 145): a read-only view of the manager's club's
 * Transfer Budget remaining, Wage Budget, total wages committed by active Contracts, and the
 * headroom (Wage Budget - committed wages). Uses the same `loadWageBudgetUsed` function that
 * `renewContract` and `completeTransfer` use for their wage-budget checks, so the committed-wages
 * figure is provably identical to what the transfer commands check against.
 */
export const getBudgetReviewScreen = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      const budget = yield* loadClubBudgetRow(club.id);
      const committedWages = yield* loadWageBudgetUsed(club.id);

      return new BudgetReviewView({
        transferBudgetRemaining: budget.transferBudgetRemaining,
        wageBudget: budget.wageBudget,
        committedWages,
        headroom: budget.wageBudget - committedWages,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );