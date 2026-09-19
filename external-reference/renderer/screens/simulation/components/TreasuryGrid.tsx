import type { MonthReport } from "@bluewave/campaign-engine";

import { Item, ItemDescription } from "../../../components/ui/item.js";

interface TreasuryGridProps {
  readonly report: MonthReport;
}

export function TreasuryGrid({ report }: TreasuryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Item className="flex-col items-start gap-0.5 bg-muted/40">
        <ItemDescription className="uppercase tracking-wider">Opening Treasury</ItemDescription>
        <span className="font-mono text-sm font-semibold text-foreground">
          {report.openingTreasury}
        </span>
      </Item>
      <Item className="flex-col items-start gap-0.5 bg-muted/40">
        <ItemDescription className="uppercase tracking-wider">Maintenance Cost</ItemDescription>
        <span className="font-mono text-sm font-semibold text-destructive">
          -{report.maintenanceCost}
        </span>
      </Item>
      <Item className="flex-col items-start gap-0.5 bg-muted/40">
        <ItemDescription className="uppercase tracking-wider">
          Construction Spending
        </ItemDescription>
        <span className="font-mono text-sm font-semibold text-warning">
          -{report.newConstructionSpending}
        </span>
      </Item>
      <Item className="flex-col items-start gap-0.5 bg-muted/40">
        <ItemDescription className="uppercase tracking-wider">Closing Treasury</ItemDescription>
        <span className="font-mono text-sm font-semibold text-success">
          {report.closingTreasury}
        </span>
      </Item>
    </div>
  );
}
