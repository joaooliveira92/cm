/**
 * The adaptive second row: one band that changes what it reports with the shell
 * it is decorating. It renders a `SecondaryRow` and nothing else — every
 * decision about what a value means lives in `career-header-state.ts`.
 */
import { CalendarDays, ClipboardList, ListOrdered, Shield, Trophy } from "lucide-react";
import { Separator } from "../../components/ui/separator.js";
import { cn } from "../../lib/utils.js";
import {
  describeSecondaryRow,
  type HeaderCareer,
  type HeaderMetric,
  type HeaderView,
  type MetricIcon,
  type SecondaryRow,
} from "./career-header-state.js";

const METRIC_ICONS: Record<MetricIcon, typeof Shield> = {
  club: Shield,
  season: CalendarDays,
  position: ListOrdered,
  points: Trophy,
  played: ClipboardList,
};

export interface HeaderSecondaryRowProps {
  readonly view: HeaderView;
  readonly career?: HeaderCareer | null;
}

export const HeaderSecondaryRow = ({ view, career = null }: HeaderSecondaryRowProps) => (
  <SecondaryRowContent row={describeSecondaryRow(view, career)} />
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
          <div className="shrink-0 text-right">
            {row.warning === null ? (
              <span>{row.status}</span>
            ) : (
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
      <span className="truncate tabular-nums">
        <span className="text-text-muted">{metric.label}:</span> {metric.value}
      </span>
    </div>
  );
};
