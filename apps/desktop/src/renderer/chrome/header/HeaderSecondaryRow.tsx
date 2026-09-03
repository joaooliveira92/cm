/**
 * The adaptive second row: one band that changes what it reports with the shell
 * it is decorating. It renders a `SecondaryRow` and nothing else — every
 * decision about what a value means lives in `career-header-state.ts`.
 */
import { CalendarDays, ClipboardList, ListOrdered, Trophy } from "lucide-react";
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
        <div className="flex w-full items-center justify-between gap-3 px-1 text-2xs text-text-secondary">
          <div className="flex min-w-0 items-center gap-3">
            {row.metrics.map((metric, index) => (
              <div key={metric.icon} className="flex min-w-0 items-center gap-3">
                {index > 0 && <Separator orientation="vertical" className="h-3" />}
                <Metric metric={metric} />
              </div>
            ))}
          </div>
          {/* The status, plus the blocking reason when the loop cannot advance.
              The reason is shown, not hidden in a `title`: a disabled control
              never delivers one. */}
          <div className="flex shrink-0 flex-col items-end leading-tight text-right">
            <span>{row.status}</span>
            {row.warning !== null && (
              <span className="text-text-warning">{row.warning}</span>
            )}
          </div>
        </div>
      );

    case "wizard":
      return (
        <div className="flex w-full items-center justify-between px-1 text-2xs text-text-secondary">
          <span className="tracking-wider uppercase">{row.heading}</span>
          <span className="uppercase">{row.hint}</span>
        </div>
      );

    case "status":
      return (
        <div className="flex w-full items-center justify-between px-1 text-2xs text-text-secondary">
          <span className="tracking-wider uppercase">{row.leading}</span>
          <span className="uppercase">{row.trailing}</span>
        </div>
      );
  }
};

const Metric = ({ metric }: { readonly metric: HeaderMetric }) => {
  const Icon = METRIC_ICONS[metric.icon];

  return (
    <div
      className={cn("flex min-w-0 items-center gap-1.5", metric.placeholder && "text-text-muted")}
      title={metric.placeholder ? `${metric.label} is not available yet` : undefined}
    >
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
      <span className="flex min-w-0 items-center gap-1 truncate tabular-nums">
        <span className="text-text-muted">{metric.label}:</span>
        <span className="truncate">{metric.value}</span>
      </span>
    </div>
  );
};
