import { formatCredits } from "../format.js";
import { BudgetRow } from "./BudgetRow.js";
import { DetailCard } from "./DetailCard.js";

export interface FinancesCardProps {
  readonly transferBudget: number;
  readonly wageBudget: number;
}

export const FinancesCard = ({ transferBudget, wageBudget }: FinancesCardProps) => (
  <DetailCard title="Finances" contentClassName="pb-2 space-y-3">
    <BudgetRow label="Transfer Budget" amount={transferBudget} />
    <BudgetRow label="Wage Budget" amount={wageBudget} />
    <div className="flex items-center justify-between">
      <span className="text-data text-text-muted">Wage / Season</span>
      <span className="text-data text-text-muted">
        {formatCredits(wageBudget)} / season
      </span>
    </div>
  </DetailCard>
);
