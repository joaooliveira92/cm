import {
  AlertTriangle,
  Bell,
  Database,
  DollarSign,
  Gauge,
  Landmark,
  Play,
  Save,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "../../components/ui/button.js";
import { Separator } from "../../components/ui/separator.js";
import { cn } from "../../lib/utils.js";
import type {
  ActiveView,
  HeaderCampaign,
  HeaderMetric,
  MetricIcon,
  SecondaryRow,
} from "../site-header-state.js";
import { describeSecondaryRow } from "../site-header-state.js";
import { NO_DRAG } from "./drag-region.js";

const METRIC_ICONS: Record<MetricIcon, typeof DollarSign> = {
  budget: DollarSign,
  prestige: Gauge,
  tension: TrendingUp,
  nation: Landmark,
  alerts: Bell,
  balance: Wallet,
};

export interface HeaderSecondaryRowProps {
  readonly activeView: ActiveView;
  readonly campaign?: HeaderCampaign | null;
  readonly onActionClick?: ((actionCode: string) => void) | undefined;
}

export function HeaderSecondaryRow({
  activeView,
  campaign = null,
  onActionClick,
}: HeaderSecondaryRowProps) {
  return (
    <SecondaryRowContent
      row={describeSecondaryRow(activeView, campaign)}
      onActionClick={onActionClick}
    />
  );
}

function SecondaryRowContent({
  row,
  onActionClick,
}: {
  readonly row: SecondaryRow;
  readonly onActionClick?: ((actionCode: string) => void) | undefined;
}) {
  switch (row.kind) {
    case "editor":
      return (
        <div className="flex w-full items-center justify-between px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5" />
            <span className="tracking-wider uppercase">{row.scenario}</span>
          </div>
          <div className="flex items-center gap-1.5" style={NO_DRAG}>
            {row.actions.map((action, index) => (
              <div key={action.code} className="flex items-center gap-1.5">
                {index > 0 && <Separator orientation="vertical" className="h-3" />}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[12px] font-medium tracking-wider uppercase"
                  onClick={() => onActionClick?.(action.code)}
                >
                  {action.icon === "validate" ? (
                    <AlertTriangle className="mr-1 h-3 w-3" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  {action.label}
                </Button>
              </div>
            ))}
          </div>
        </div>
      );

    case "campaign":
      return (
        <div className="flex w-full items-center justify-between px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {row.metrics.map((metric, index) => (
              <div key={metric.icon} className="flex items-center gap-4">
                {index > 0 && <Separator orientation="vertical" className="h-3" />}
                <Metric metric={metric} />
              </div>
            ))}
          </div>
          <div className="text-[12px]" style={NO_DRAG}>
            <span>
              Status: <span>{row.status}</span>
            </span>
          </div>
        </div>
      );

    case "wizard":
      return (
        <div className="flex w-full items-center justify-between px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Play className="h-3.5 w-3.5" />
            <span className="tracking-wider uppercase">{row.heading}</span>
          </div>
          <div className="text-[12px] uppercase">{row.hint}</div>
        </div>
      );

    case "preferences":
      return (
        <div className="flex w-full items-center px-1 text-xs text-muted-foreground">
          <span className="mr-1 tracking-wider uppercase">{row.label}</span>
          <span className="tracking-wider uppercase">{row.detail}</span>
        </div>
      );

    case "status":
      return (
        <div className="flex w-full items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="tracking-wider uppercase">{row.leading}</span>
          <span className="uppercase">{row.trailing}</span>
        </div>
      );
  }
}

function Metric({ metric }: { readonly metric: HeaderMetric }) {
  const Icon = METRIC_ICONS[metric.icon];

  return (
    <div
      className={cn("flex items-center gap-1.5", metric.placeholder && "text-muted-foreground")}
      title={metric.placeholder ? `${metric.label} is not reported by the engine yet` : undefined}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs tabular-nums">
        <span className="text-muted-foreground">{metric.label}:</span> {metric.value}
      </span>
    </div>
  );
}
