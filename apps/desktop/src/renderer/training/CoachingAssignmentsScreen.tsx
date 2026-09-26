/**
 * Coaching Assignments screen (Screen 111) — the main Training area view.
 *
 * Lists the manager's own club's coaching staff with their quality ratings and departments.
 * Uses existing coach data from the `staff` DB table read through the `getCoachingAssignments`
 * RPC. The `CoachCard` component is extracted for reuse in Screen 105 (Training Overview).
 *
 * ## States
 *
 * - `loading` — the read is in flight.
 * - `ready` — list of coach cards with name, quality, and department.
 * - `error` — the RPC failed (save not found, transport error).
 * - `empty` — no coaches returned (club has not materialised staff yet).
 *
 * The coach list is terminal: no drill-downs and no keyboard focus on rows. The screen's two
 * actions are the "Workload and recovery" and "Player development" buttons, which open the Training
 * area's Workload and Recovery (Screen 112) and Player Development Centre (Screen 114) sub-surfaces. Navigation is otherwise the shell's usual `g b`/escape.
 *
 * Reached from the career chrome's Training tab (`g 3`) or from the Training Overview's link.
 */
import { type SaveId } from "@cm-clone/contracts";
import { ReadStateMessage } from "../components/shared/ReadStateMessage.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { coachingAssignmentsAtom, readState, useAtomValue } from "../rpc.js";
import { CoachCard } from "./CoachCard.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The loading, failed and empty states share one shell; only the empty one keeps the links. */
const MESSAGE_SHELL = { title: "Coaching Assignments", label: "Coaching assignments", focusId: "training" } as const;

export const CoachingAssignmentsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = readState(useAtomValue(coachingAssignmentsAtom(saveId)), {
    loading: "Loading coaching assignments...",
    failed: "Coaching assignments could not be loaded.",
  });
  if (result._tag !== "Ready") {
    return <ReadStateMessage {...MESSAGE_SHELL} message={result.message} />;
  }

  const view = result.value;

  if (view.coaches.length === 0) {
    return (
      <ReadStateMessage {...MESSAGE_SHELL} message="No coaching staff assigned yet. Staff will appear once you join a club.">
        <CoachingLinks saveId={saveId} />
      </ReadStateMessage>
    );
  }

  return (
    <main
      id="coaching-assignments-page"
      data-focus-id="training"
      aria-labelledby="coaching-assignments-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="coaching-assignments-heading" className="text-2xl font-bold">
          Coaching Assignments
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your club's coaching staff and their quality ratings
        </p>
        <CoachingLinks saveId={saveId} />
      </header>

      <ul className="mt-6 space-y-3" aria-label="Coaching staff">
        {view.coaches.map((coach) => (
          <CoachCard
            key={coach.id}
            name={coach.name}
            quality={coach.quality}
            department={coach.department}
          />
        ))}
      </ul>
    </main>
  );
};

/** Opens the Training area's squad-wide sub-surfaces: Workload and Recovery (Screen 112) and the
 *  Player Development Centre (Screen 114). */
const CoachingLinks = ({ saveId }: { readonly saveId: SaveId }) => (
  <div className="mt-4 flex gap-2">
    <Button
      type="button"
      variant="secondary"
      className={FOCUS_RING.join(" ")}
      onClick={(event) => navigateCareer({ type: "trainingWorkload", saveId }, intentOfClick(event))}
    >
      Workload and recovery
    </Button>
    <Button
      type="button"
      variant="secondary"
      className={FOCUS_RING.join(" ")}
      onClick={(event) => navigateCareer({ type: "trainingDevelopment", saveId }, intentOfClick(event))}
    >
      Player development
    </Button>
  </div>
);
