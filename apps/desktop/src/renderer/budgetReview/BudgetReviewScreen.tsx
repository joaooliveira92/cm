import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import { budgetReviewAtom, describeRpcError, typedError, useAtomValue } from "../rpc.js";
import { PANEL } from "../theme.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/**
 * Transfer and Wage Budget Review screen (Screen 145). Shows the manager's club's Transfer Budget
 * remaining, Wage Budget, total wages committed by active Contracts, and headroom under the Wage
 * Budget. A pure read — no command side.
 */
export const BudgetReviewScreen = ({
  saveId,
}: {
  readonly saveId: SaveId;
}) => {
  const result = useAtomValue(budgetReviewAtom(saveId));

  if (result._tag === "Initial") {
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="budgetReview" aria-label="Budget Review">
        <h1 className="text-2xl font-bold">Transfer & Wage Budget Review</h1>
        <p className="mt-4 text-text-secondary">Loading budget information...</p>
      </main>
    );
  }

  if (result._tag === "Failure") {
    const error = typedError(result);
    const message = error === null
      ? "Budget information could not be loaded."
      : describeRpcError(error);
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="budgetReview" aria-label="Budget Review">
        <h1 className="text-2xl font-bold">Transfer & Wage Budget Review</h1>
        <p className="mt-4 text-text-secondary">{message}</p>
      </main>
    );
  }

  const { transferBudgetRemaining, wageBudget, committedWages, headroom } = result.value;

  return (
    <main
      className={PAGE_CLASS}
      tabIndex={-1}
      data-focus-id="budgetReview"
      aria-label="Budget Review"
    >
      <h1 className="text-2xl font-bold">Transfer & Wage Budget Review</h1>
      <p className="mt-1 mb-6 text-text-secondary text-sm">
        Your club's current Transfer Budget, Wage Budget, and committed wages.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-md border p-4 ${PANEL}`}>
          <p className="text-sm text-text-secondary">Transfer Budget Remaining</p>
          <p className="text-xl font-semibold mt-1">{transferBudgetRemaining.toLocaleString()} Credits</p>
        </div>
        <div className={`rounded-md border p-4 ${PANEL}`}>
          <p className="text-sm text-text-secondary">Wage Budget</p>
          <p className="text-xl font-semibold mt-1">{wageBudget.toLocaleString()} Credits/season</p>
        </div>
        <div className={`rounded-md border p-4 ${PANEL}`}>
          <p className="text-sm text-text-secondary">Committed Wages</p>
          <p className="text-xl font-semibold mt-1">{committedWages.toLocaleString()} Credits/season</p>
        </div>
        <div className={`rounded-md border p-4 ${PANEL}`}>
          <p className="text-sm text-text-secondary">Headroom</p>
          <p className={`text-xl font-semibold mt-1 ${headroom < 0 ? "text-red-500" : ""}`}>
            {headroom.toLocaleString()} Credits/season
          </p>
        </div>
      </div>
    </main>
  );
};