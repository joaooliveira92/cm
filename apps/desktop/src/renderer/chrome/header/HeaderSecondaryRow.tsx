/**
 * The adaptive second row: one band that changes what it reports with the shell
 * it is decorating. It renders a `SecondaryRow` and nothing else — every
 * decision about what a value means lives in `career-header-state.ts`.
 */
import {
  CalendarDays,
  ClipboardList,
  Coins,
  FileText,
  HeartPulse,
  ListOrdered,
  Star,
  Trophy,
  Wallet,
} from "lucide-react";
import { Separator } from "../../components/ui/separator.js";
import { cn } from "../../lib/utils.js";
import {
  describeSecondaryRow,
  type HeaderMetric,
  type HeaderState,
  type MetricIcon,
  type SecondaryRow,
} from "./career-header-state.js";

const METRIC_ICONS: Record<MetricIcon, typeof CalendarDays> = {
  season: CalendarDays,
  position: ListOrdered,
  points: Trophy,
  played: ClipboardList,
  rating: Star,
  value: Coins,
  wage: Wallet,
  contract: FileText,
  injury: HeartPulse,
};

export interface HeaderSecondaryRowProps {
  readonly state: HeaderState;
}

export const HeaderSecondaryRow = ({ state }: HeaderSecondaryRowProps) => (
  <SecondaryRowContent row={describeSecondaryRow(state)} />
);

const SecondaryRowContent = ({ row }: { readonly row: SecondaryRow }) => {
  switch (row.kind) {
    case "career":
      return (
        <div className="flex w-full items-center justify-between gap-3 px-1 text-caption text-header-fg">
          <div className="flex min-w-0 items-center gap-3">
            {row.metrics.map((metric, index) => (
              <div key={metric.icon} className="flex min-w-0 items-center gap-3">
                {index > 0 && <Separator orientation="vertical" className="h-3" />}
                <Metric metric={metric} />
              </div>
            ))}
          </div>
          {/* Why Continue is greyed is the bottom bar's reason line, beside the
              control it explains, so the header carries the status alone. */}
          <div className="flex shrink-0 flex-col items-end leading-tight text-right">
            <span>{row.status}</span>
          </div>
        </div>
      );

    case "wizard":
      return <CaptionRow leading={row.heading} trailing={row.hint} />;

    case "status":
      return <CaptionRow leading={row.leading} trailing={row.trailing} />;
  }
};

/** The two-caption row the pre-career shells share: a heading left, a hint right. */
const CaptionRow = ({ leading, trailing }: { readonly leading: string; readonly trailing: string }) => (
  <div className="flex w-full items-center justify-between px-1 text-caption text-header-fg">
    <span className="tracking-wider uppercase">{leading}</span>
    <span className="uppercase">{trailing}</span>
  </div>
);

const Metric = ({ metric }: { readonly metric: HeaderMetric }) => {
  const Icon = METRIC_ICONS[metric.icon];

  return (
    <div
      className={cn("flex min-w-0 items-center gap-1.5", metric.placeholder && "opacity-70")}
      title={metric.placeholder ? `${metric.label} is not available yet` : undefined}
    >
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0 text-header-muted" />
      <span className="flex min-w-0 items-center gap-1 truncate tabular-nums text-header-fg">
        <span className="opacity-70">{metric.label}:</span>
        <span className="truncate">{metric.value}</span>
      </span>
    </div>
  );
};
