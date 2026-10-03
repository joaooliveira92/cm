import { type SaveId } from "@cm-clone/contracts";
import { ReadStateMessage } from "../components/shared/ReadStateMessage.js";
import { FOCUS_RING } from "../focus.js";
import { budgetReviewAtom, readState, useAtomValue } from "../rpc.js";
import { BudgetFigures } from "./BudgetFigures.js";

const PAGE_CLASS = `p-8 text-foreground ${FOCUS_RING.join(" ")}`;

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
  const result = readState(useAtomValue(budgetReviewAtom(saveId)), {
    loading: "Loading budget information...",
    failed: "Budget information could not be loaded.",
  });

  if (result._tag !== "Ready") {
    return (
      <ReadStateMessage
        title="Transfer & Wage Budget Review"
        label="Budget Review"
        focusId="budgetReview"
        message={result.message}
      />
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
      <h1 className="text-title">Transfer & Wage Budget Review</h1>
      <p className="mt-1 mb-6 text-text-secondary text-body">
        Your club's current Transfer Budget, Wage Budget, and committed wages.
      </p>
      <BudgetFigures
        transferBudgetRemaining={transferBudgetRemaining}
        wageBudget={wageBudget}
        committedWages={committedWages}
        headroom={headroom}
      />
    </main>
  );
};