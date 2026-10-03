/**
 * The four budget figures, as a grid of labelled panels.
 *
 * Extracted so the manager's own Budget Review (Screen 145) and any club's Finances
 * (`ClubFinancesDetailScreen`, Screen 39) show the same four numbers in the same shape rather than
 * two grids that drift. The club-scoped rule asks for one implementation per subject.
 *
 * These four are all there is: income, expenditure and projections have no model in this game, and
 * the Group C ledger `deferred`s them rather than this component carrying a zero that reads like a
 * fact.
 */
import type { ReactNode } from "react";
import { PANEL } from "../theme.js";

/**
 * One labelled budget figure. The value may carry a state (`valueClass`/`trailing`) — headroom is
 * the one figure that does: overspend gets a word as well as a colour, because a red number alone
 * tells a colour-blind reader nothing.
 */
const Figure = ({
  label,
  value,
  valueClass = "",
  trailing = null,
}: {
  readonly label: string;
  readonly value: string;
  readonly valueClass?: string;
  readonly trailing?: ReactNode;
}) => (
  <div className={`rounded-md border p-4 ${PANEL}`}>
    <p className="text-body text-text-secondary">{label}</p>
    <p className={`text-figure mt-1 ${valueClass}`}>
      {value}
      {trailing}
    </p>
  </div>
);

export const BudgetFigures = ({
  transferBudgetRemaining,
  wageBudget,
  committedWages,
  headroom,
}: {
  readonly transferBudgetRemaining: number;
  readonly wageBudget: number;
  readonly committedWages: number;
  readonly headroom: number;
}) => (
  <div className="grid grid-cols-2 gap-4">
    <Figure
      label="Transfer Budget Remaining"
      value={`${transferBudgetRemaining.toLocaleString()} Credits`}
    />
    <Figure label="Wage Budget" value={`${wageBudget.toLocaleString()} Credits/season`} />
    <Figure label="Committed Wages" value={`${committedWages.toLocaleString()} Credits/season`} />
    <Figure
      label="Headroom"
      value={`${headroom.toLocaleString()} Credits/season`}
      valueClass={headroom < 0 ? "text-red-500" : ""}
      trailing={
        headroom < 0 ? <span className="ml-2 text-body font-normal">(over budget)</span> : null
      }
    />
  </div>
);
