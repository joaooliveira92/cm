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
import { PANEL } from "../theme.js";

const Figure = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className={`rounded-md border p-4 ${PANEL}`}>
    <p className="text-sm text-text-secondary">{label}</p>
    <p className="text-xl font-semibold mt-1">{value}</p>
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
    <div className={`rounded-md border p-4 ${PANEL}`}>
      <p className="text-sm text-text-secondary">Headroom</p>
      {/* Overspend is the one figure that carries a state, so it carries a word as well as a
          colour — a red number alone tells a colour-blind reader nothing. */}
      <p className={`text-xl font-semibold mt-1 ${headroom < 0 ? "text-red-500" : ""}`}>
        {headroom.toLocaleString()} Credits/season
        {headroom < 0 ? <span className="ml-2 text-sm font-normal">(over budget)</span> : null}
      </p>
    </div>
  </div>
);
