import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { type ClubId } from "@cm-clone/contracts";
import { createSave } from "../../seeded-save.js";
import { getBudgetReviewScreen } from "../../../src/main/transfers/budgetReview.js";
import { loadClubBudgetRow, loadWageBudgetUsed } from "../../../src/main/transfers/budgets.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-budget-review-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

// ---------------------------------------------------------------------------
// getBudgetReviewScreen
// ---------------------------------------------------------------------------

it.effect("returns Transfer Budget remaining, Wage Budget, committed wages and headroom", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const saveId = save.id;

    // Find the user's club and get the raw budget/committed values directly
    const { rawBudget, rawCommitted } = yield* withSave(saveId, Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubRows = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
      const clubId = clubRows[0]!.id as ClubId;

      const budget = yield* loadClubBudgetRow(clubId);
      const committed = yield* loadWageBudgetUsed(clubId);
      return { clubId, rawBudget: budget, rawCommitted: committed };
    }));

    // Now call the screen read
    const screen = yield* getBudgetReviewScreen(savesDir, saveId);

    strictEqual(screen.transferBudgetRemaining, rawBudget.transferBudgetRemaining,
      "transferBudgetRemaining matches loadClubBudgetRow");
    strictEqual(screen.wageBudget, rawBudget.wageBudget,
      "wageBudget matches loadClubBudgetRow");
    strictEqual(screen.committedWages, rawCommitted,
      "committedWages matches loadWageBudgetUsed");
    strictEqual(screen.headroom, rawBudget.wageBudget - rawCommitted,
      "headroom equals wageBudget - committedWages");
  }),
);

it.effect("committed wages equal the sum completeTransfer and renewContract use (loadWageBudgetUsed)", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const saveId = save.id;

    // The handler uses loadWageBudgetUsed internally, so they're provably the same.
    // Let's verify by reading both the handler result and calling loadWageBudgetUsed directly.
    const screen = yield* getBudgetReviewScreen(savesDir, saveId);

    const { clubId } = yield* withSave(saveId, Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubRows = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
      return { clubId: clubRows[0]!.id as ClubId };
    }));

    const directCommitted = yield* withSave(saveId, loadWageBudgetUsed(clubId));

    strictEqual(screen.committedWages, directCommitted,
      "handler's committedWages equals direct loadWageBudgetUsed call");
  }),
);

it.effect("headroom is wageBudget - committedWages", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const saveId = save.id;

    const screen = yield* getBudgetReviewScreen(savesDir, saveId);
    strictEqual(screen.headroom, screen.wageBudget - screen.committedWages,
      "headroom is computed correctly");
  }),
);