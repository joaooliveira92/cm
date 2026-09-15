import type {
  ActiveLeaguesEntityEstimate,
  ProcessingCostReading,
} from "@cm-clone/shared";
import { PROCESSING_COST_METER_MAX } from "@cm-clone/shared";
import type { ActiveLeaguesValidation } from "./atoms.js";

/**
 * The consequence sidebar: what the current configuration costs, and what happens when the player
 * commits to it.
 *
 * It is a *persistence consequence panel, never a second form* (spec, "Sidebar contract"). Every
 * value it renders arrives already derived from the one authoritative setup state — it computes
 * nothing, stores nothing, and owns no control that changes the configuration, so what it says can
 * never disagree with the grid beside it.
 *
 * Two controls the reference brief puts here are deliberately absent. There is no start-date
 * picker, because the Calendar advances by Matchday and a date would select nothing; there is no
 * database-preset selector, because world generation does not read the scope yet and the lever
 * would scale nothing. Their slot carries the setup's validation status and a plain statement of
 * what Continue actually does instead. Do not reintroduce either "to match the brief".
 *
 * The processing-cost reading is a rating of the *configuration*, not of this computer: the copy
 * speaks of longer processing intervals and makes no hardware-capability claim, because no code
 * here benchmarks anything.
 */

export interface ActiveLeaguesSidebarProps {
  readonly entityEstimate: ActiveLeaguesEntityEstimate;
  readonly processingCost: ProcessingCostReading;
  readonly validation: ActiveLeaguesValidation;
  /** True while a newer resolve is in flight: the figures shown are the previous answer. */
  readonly stale?: boolean;
}

const formatCount = (value: number): string => value.toLocaleString("en-GB");

/** The one statement of what Continue does. It stops at the snapshot on purpose — the wider world
 *  is not generated here, and the panel must not imply that it already exists. */
export const NEXT_STEP_COPY =
  "Continue records this selection. The world is generated behind the Manager step.";

export const ActiveLeaguesSidebar = ({
  entityEstimate,
  processingCost,
  validation,
  stale = false,
}: ActiveLeaguesSidebarProps) => (
  <aside
    aria-label="Setup consequences"
    className="flex min-h-0 flex-1 flex-col gap-3 rounded-panel border border-panel-border bg-panel-bg p-3"
    data-testid="consequence-sidebar"
  >
    <section aria-labelledby="entity-count-heading">
      <h2
        id="entity-count-heading"
        className="text-2xs font-semibold uppercase tracking-wider text-text-secondary"
      >
        Loaded entities
      </h2>
      <p
        className="mt-1 text-xl font-semibold tabular-nums text-text-primary"
        aria-busy={stale ? "true" : undefined}
        data-testid="entity-count"
      >
        {formatCount(entityEstimate.entityCount)}
      </p>
      {/* The breakdown is derived from the same rows as the total, so the parts always sum to it. */}
      <p className="text-2xs text-text-muted">
        {formatCount(entityEstimate.clubCount)} clubs ·{" "}
        {formatCount(entityEstimate.playerCount)} players ·{" "}
        {formatCount(entityEstimate.staffCount)} staff
      </p>
    </section>

    <section aria-labelledby="processing-cost-heading">
      <h2
        id="processing-cost-heading"
        className="text-2xs font-semibold uppercase tracking-wider text-text-secondary"
      >
        Processing cost
      </h2>
      <ProcessingCostMeter reading={processingCost} />
      <p className="mt-1 text-2xs text-text-muted">{processingCost.explanation}</p>
      {processingCost.expensiveWarning !== null && (
        <p role="note" className="mt-2 rounded-control bg-text-warning/10 p-2 text-2xs text-text-warning">
          {processingCost.expensiveWarning}
        </p>
      )}
    </section>

    {/* A polite live region so the consequence panel *speaks* when it changes. It carries the
        cost reading only — a region that echoed every figure would talk over every keystroke. */}
    <p role="status" aria-live="polite" className="sr-only">
      {`Processing cost ${processingCost.label}, ${processingCost.meterValue} of ${PROCESSING_COST_METER_MAX}.`}
    </p>

    {/* The flexible spacer. Everything above sits at the top of the panel, the validation and
        next-step slot stays pinned to the bottom, whatever the panel's height. */}
    <div className="flex-1" />

    <section
      aria-labelledby="setup-status-heading"
      className="shrink-0 border-t border-border-subtle pt-2"
      data-testid="setup-status"
    >
      <h2
        id="setup-status-heading"
        className="text-2xs font-semibold uppercase tracking-wider text-text-secondary"
      >
        Status
      </h2>
      {validation.valid ? (
        <p className="mt-1 text-xs text-text-body">Ready to continue.</p>
      ) : (
        <ul className="mt-1 list-disc pl-4 text-xs text-text-warning">
          {(validation.blockingMessages.length > 0
            ? validation.blockingMessages
            : [
                validation.hasAtLeastOneActiveLeague
                  ? "Checking this setup…"
                  : "Add at least one active league to continue.",
              ]
          ).map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-2xs text-text-muted">{NEXT_STEP_COPY}</p>
    </section>
  </aside>
);

/**
 * The CM Clone-native five-segment bar. Not a star rating: the reference game's stars are a
 * hardware verdict, and this is a workload reading. Exposed as a `meter` so a screen reader gets
 * the value and the label rather than five decorative boxes.
 */
const ProcessingCostMeter = ({ reading }: { readonly reading: ProcessingCostReading }) => (
  <div
    role="meter"
    aria-label="Processing cost"
    aria-valuemin={0}
    aria-valuemax={PROCESSING_COST_METER_MAX}
    aria-valuenow={reading.meterValue}
    aria-valuetext={reading.label}
    className="mt-1 flex items-center gap-2"
    data-testid="processing-cost-meter"
  >
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: PROCESSING_COST_METER_MAX }, (_, index) => (
        <span
          key={index}
          className={`h-2 w-4 rounded-sm ${
            index < reading.meterValue ? SEGMENT_FILL[reading.category] : "bg-surface-raised"
          }`}
        />
      ))}
    </span>
    <span className="text-xs font-medium text-text-primary">{reading.label}</span>
  </div>
);

/** Colour carries emphasis, never meaning on its own: the label beside the bar says the same
 *  thing in words, so a player who cannot separate these hues loses nothing. */
const SEGMENT_FILL: Readonly<Record<ProcessingCostReading["category"], string>> = {
  light: "bg-text-success",
  balanced: "bg-text-success",
  heavy: "bg-text-warning",
  very_heavy: "bg-text-danger",
};
