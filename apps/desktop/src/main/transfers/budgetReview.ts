import {
  BudgetReviewView,
  ClubFinancesView,
  ClubNotFoundError,
  ClubSummary,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import type { StatureTier } from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { loadUserClub } from "../club/squad.js";
import { loadClubBudgetRow, loadWageBudgetUsed } from "./budgets.js";

/**
 * Club Finances (Screen 39): the same budgets for **any** club.
 *
 * `loadClubBudgetRow` and `loadWageBudgetUsed` were already club-parameterised; only the entry
 * point above hardcoded the user's club. So this is a sibling entry point rather than a second
 * read, and the club rides with the figures so one read answers the page.
 *
 * An unknown club is `ClubNotFoundError`: every real club has a budget row, so there is no empty
 * answer a missing club could impersonate — but failing loudly keeps the two apart anyway.
 */
export const getClubFinances = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubRows = yield* sql<{ statureTier: StatureTier; isUserClub: number }>`
        SELECT stature_tier as "statureTier", is_user_club as "isUserClub"
        FROM clubs WHERE id = ${clubId}`;
      const club = clubRows[0];
      if (club === undefined) {
        return yield* new ClubNotFoundError({ id: clubId });
      }

      const nameOf = yield* displayNames;
      const budget = yield* loadClubBudgetRow(clubId);
      const committedWages = yield* loadWageBudgetUsed(clubId);

      return new ClubFinancesView({
        club: new ClubSummary({ id: clubId, name: nameOf(clubId), statureTier: club.statureTier }),
        // SQLite has no boolean: the column is the integer flag world generation writes.
        isUserClub: club.isUserClub === 1,
        transferBudgetRemaining: budget.transferBudgetRemaining,
        wageBudget: budget.wageBudget,
        committedWages,
        headroom: budget.wageBudget - committedWages,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

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