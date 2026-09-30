import type { PlayerAssignmentView } from "@cm-clone/contracts";
import { slotLabel } from "@cm-clone/shared";
import { PitchMarkings } from "./FormationPitch.js";
import { pitchLayout } from "./pitchLayout.js";
import { ratingBorder } from "./overviewFormat.js";

/** "One" for Ada One; a starter whose player left the club reads as vacant. */
const markerName = (assignment: PlayerAssignmentView): string =>
  assignment.lastName ?? "Vacant";

const spokenSlot = (assignment: PlayerAssignmentView): string => {
  const who =
    assignment.firstName === null
      ? "vacant"
      : `${assignment.firstName} ${assignment.lastName}`;
  const rating = assignment.positionRating === null ? "" : `, rating ${assignment.positionRating}`;
  return `${slotLabel(assignment.cell)}: ${who}${rating}`;
};

/**
 * The saved eleven on the pitch, read-only: each marker carries the starter's Position Rating in
 * his cell, tinted by how well it fits, over their surname and cell. The editor's `FormationPitch`
 * is the interactive twin; this one has no controls, so its list is the whole accessible surface
 * and each slot speaks one sentence.
 */
export const OverviewPitch = ({
  assignments,
}: {
  readonly assignments: ReadonlyArray<PlayerAssignmentView>;
}) => {
  const spots = pitchLayout(assignments.map((assignment) => assignment.cell));
  return (
    <div
      data-testid="overview-pitch"
      className="pitch-grass relative mx-auto aspect-[68/100] w-full max-w-[400px] overflow-hidden rounded-panel border border-panel-border-dark shadow-panel"
    >
      <PitchMarkings />
      {assignments.length === 0 ? (
        <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-panel bg-black/55 px-3 py-2 text-center text-body font-semibold text-text-bright">
          No tactic saved — set one to prepare.
        </p>
      ) : (
        <ul aria-label="Formation slots" className="absolute inset-0">
          {spots.map(({ slotIndex, x, y }) => {
            const assignment = assignments[slotIndex]!;
            const vacant = assignment.firstName === null;
            return (
              <li
                key={slotIndex}
                className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <span className="sr-only">{spokenSlot(assignment)}</span>
                <span
                  aria-hidden="true"
                  className={`flex size-8 items-center justify-center rounded-full border-2 text-data font-bold tabular-nums text-text-bright shadow-panel ${
 vacant
 ? "border-dashed border-text-bright/70 bg-transparent"
 : `${ratingBorder(assignment.positionRating)} ${
                        assignment.cell.row === "GK" ? "bg-pitch-marker-gk" : "bg-pitch-marker"
                      }`
                  }`}
                >
                  {assignment.positionRating ?? "–"}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 max-w-full truncate text-caption font-semibold text-text-bright [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]"
                >
                  {markerName(assignment)}
                </span>
                <span
                  aria-hidden="true"
                  className="text-caption text-text-bright/75 [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]"
                >
                  {slotLabel(assignment.cell)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
