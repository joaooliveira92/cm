import { NumberTicker } from "../components/ui/number-ticker.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip.js";
import { formatCredits } from "../format.js";

export interface BudgetRowProps {
  readonly label: string;
  readonly amount: number;
}

/** A budget line: the animated figure, with the exact Credits amount in its tooltip. */
export const BudgetRow = ({ label, amount }: BudgetRowProps) => (
  <div className="flex items-center justify-between">
    <span className="text-data text-text-muted">{label}</span>
    <Tooltip>
      <TooltipTrigger>
        <span className="text-body font-semibold tabular-nums">
          <NumberTicker value={amount} locale suffix=" Cr" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span>{formatCredits(amount)}</span>
      </TooltipContent>
    </Tooltip>
  </div>
);
