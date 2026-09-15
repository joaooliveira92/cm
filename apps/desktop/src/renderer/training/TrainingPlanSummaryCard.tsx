import type { ReactNode } from "react";
import { trainingFocusLabel, type TrainingFocusValue } from "./trainingFocusOptions.js";

/**
 * The training plan summary card: one player's standing Training Focus and what it does to their
 * Player Development.
 *
 * Built to be lifted into Screens 105 (Training Overview) and 114 (Player Development Centre)
 * unchanged: it takes the player's name and Training Focus as props and reads no atom, route, or
 * context. `children` is the slot for whatever action the host places on the card (a link to the
 * plan, say); the card itself has none.
 */
export const TrainingPlanSummaryCard = ({
  playerName,
  focus,
  children,
}: {
  readonly playerName: string;
  readonly focus: TrainingFocusValue;
  readonly children?: ReactNode;
}) => (
  <section
    aria-label={`${playerName} training plan`}
    className="rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
  >
    <div className="flex items-center justify-between gap-3">
      <h3 className="truncate text-base font-semibold text-text-primary">{playerName}</h3>
      <span className="rounded-control bg-panel-bg px-2 py-0.5 text-sm font-medium text-text-secondary">
        Training Focus: {trainingFocusLabel(focus)}
      </span>
    </div>
    <p className="mt-1 text-xs text-text-secondary">{describeFocus(focus)}</p>
    {children}
  </section>
);

const describeFocus = (focus: TrainingFocusValue): string =>
  focus === null
    ? "No Category receives a larger share of Player Development when the Season concludes."
    : `${trainingFocusLabel(focus)} Attributes receive a larger share of Player Development when the Season concludes.`;
