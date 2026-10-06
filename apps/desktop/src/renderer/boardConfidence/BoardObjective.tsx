import { type BoardObjectiveView } from "@cm-clone/contracts";
import { PANEL } from "../theme.js";
import { objectiveSummary } from "./objective.js";

/**
 * A set objective: the season's band, and how the season has resolved against it. Carries
 * `role="region"` explicitly — an `aria-label` on a bare `div` does not make it a landmark, so
 * without the role it is unaddressable to a screen reader and to a spec.
 */
export const BoardObjective = ({ objective }: { readonly objective: BoardObjectiveView }) => (
  <div role="region" aria-label="Board Objective" className={`rounded-md border p-4 ${PANEL}`}>
    <p className="text-body text-text-secondary">
      Season {objective.seasonNumber} league objective
    </p>
    <p className="text-figure mt-1">
      Finish between {objective.minPosition} and {objective.maxPosition}
    </p>
    <p className="mt-3 text-body text-text-secondary">{objectiveSummary(objective)}</p>
  </div>
);