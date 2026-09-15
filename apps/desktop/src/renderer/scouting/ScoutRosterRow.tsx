import type { ScoutingTargetView } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Progress } from "../components/ui/progress.js";
import { scoutingProgressLabel } from "./ScoutingCoverageSummary.js";

/** What a Scout is observing, in words: a Club, a Player, or nothing. */
export const targetOf = (scout: ScoutingTargetView): string => {
  if (scout.targetClubName !== null) return `Club: ${scout.targetClubName}`;
  if (scout.playerName !== null) return `Player: ${scout.playerName}`;
  return "No assignment";
};

/**
 * The Scouting Progress a row can honestly state. Only a Player target carries one: a Club target
 * advances each of its Players separately and never holds a value of its own, and a free Scout is
 * accruing nothing. A Player with no progress row is Unscouted, not at zero.
 */
export const progressOf = (scout: ScoutingTargetView): string => {
  if (scout.targetClubId !== null) return "Tracked per Player";
  if (scout.playerId === null) return "Not observing";
  if (scout.progress === null) return "Unscouted";
  return scoutingProgressLabel(scout.progress);
};

/**
 * One Scout on the club's roster: name, quality, current target and Scouting Progress.
 *
 * Props only, so the Scouting Assignment screen (121) and the Scouting Centre (118) render the same
 * row: the assignment screen passes its actions as `children`, the Centre passes none.
 */
export const ScoutRosterRow = ({
  scout,
  children,
}: {
  readonly scout: ScoutingTargetView;
  readonly children?: ReactNode;
}) => {
  const playerProgress = scout.targetClubId === null && scout.playerId !== null ? scout.progress : null;
  return (
    <li
      aria-label={scout.scoutName}
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-panel border border-panel-border bg-card p-4 text-sm text-card-foreground shadow-panel"
    >
      <span className="w-40 font-semibold text-text-primary">{scout.scoutName}</span>
      <span className="w-24 text-text-secondary">Quality {scout.quality}</span>
      <span className="w-56 text-text-secondary">{targetOf(scout)}</span>
      <span className="flex w-48 items-center gap-2 text-text-secondary">
        <span>
          <span className="sr-only">Scouting Progress: </span>
          {progressOf(scout)}
        </span>
        {playerProgress !== null && (
          <Progress
            value={Math.min(100, Math.max(0, playerProgress))}
            aria-label={`${scout.scoutName} Scouting Progress`}
            className="w-20"
          />
        )}
      </span>
      {children !== undefined && <span className="ml-auto flex items-center gap-2">{children}</span>}
    </li>
  );
};
