import type { SaveId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { trainingScheduleAtom, useAtomValue } from "../rpc.js";
import { templateLabel } from "./trainingScheduleCopy.js";

/**
 * The Training Overview's Schedule card: which template the saved schedule matches (or "Custom"),
 * and the way into the Training Schedule. It reads the schedule itself, so a slow or failed read
 * never holds up the rest of the Overview.
 */
export const TrainingScheduleCard = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(trainingScheduleAtom(saveId));

  const summary =
    result._tag === "Success"
      ? `Current schedule: ${templateLabel(result.value.sessions)}`
      : result._tag === "Failure"
        ? "The schedule could not be loaded."
        : "Loading the schedule...";

  return (
    <section
      aria-labelledby="schedule-summary-heading"
      className="rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
    >
      <h2 id="schedule-summary-heading" className="text-lg font-semibold">
        Training Schedule
      </h2>
      <p className="mt-1 text-sm text-text-secondary">{summary}</p>
      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          onClick={(event) => navigateCareer({ type: "trainingSchedule", saveId }, intentOfClick(event))}
        >
          Plan training
        </Button>
      </div>
    </section>
  );
};
