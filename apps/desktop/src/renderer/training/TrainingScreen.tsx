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
 * Reached from the career chrome's Training tab (`g 3`).
 */
import { type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  coachingAssignmentsAtom,
  describeRpcError,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { trainingViewState } from "./trainingViewState.js";
import { CoachCard } from "./CoachCard.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const TrainingScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(coachingAssignmentsAtom(saveId));
  const state = trainingViewState(result);

  if (state === "error") {
    return <TrainingMessage message={messageOf(typedError(result))} />;
  }
  if (state === "loading" || result._tag !== "Success") {
    return <TrainingMessage message="Loading coaching assignments..." />;
  }

  const view = result.value;

  if (view.coaches.length === 0) {
    return (
      <TrainingMessage
        message="No coaching staff assigned yet. Staff will appear once you join a club."
      >
        <TrainingLinks saveId={saveId} />
      </TrainingMessage>
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
        <TrainingLinks saveId={saveId} />
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

/** The sentence a failed read shows. A defect-only cause carries no typed error, so it falls back
 *  to the generic line; a missing save always carries its own sentence. */
const messageOf = (error: RpcClientError<"getCoachingAssignments"> | null): string =>
  error === null
    ? "Coaching assignments could not be loaded."
    : describeRpcError(error);

/** Opens the Training area's squad-wide sub-surfaces: Workload and Recovery (Screen 112) and the
 *  Player Development Centre (Screen 114). */
const TrainingLinks = ({ saveId }: { readonly saveId: SaveId }) => (
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

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line, plus any
 *  action that stays available in that state. */
const TrainingMessage = ({
  message,
  children,
}: {
  readonly message: string;
  readonly children?: ReactNode;
}) => (
  <main
    className={PAGE_CLASS}
    tabIndex={-1}
    data-focus-id="training"
    aria-label="Coaching assignments"
  >
    <h1 className="text-2xl font-bold">Coaching Assignments</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
    {children}
  </main>
);