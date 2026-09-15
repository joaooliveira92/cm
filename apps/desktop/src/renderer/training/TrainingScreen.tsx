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
 * The screen is a terminal list: no drill-downs, no actions, no keyboard focus on rows.
 * Navigation is through the shell's usual `g b`/escape.
 *
 * Reached from the career chrome's Training tab (`g 3`).
 */
import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
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
      />
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

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line. */
const TrainingMessage = ({ message }: { readonly message: string }) => (
  <main
    className={PAGE_CLASS}
    tabIndex={-1}
    data-focus-id="training"
    aria-label="Coaching assignments"
  >
    <h1 className="text-2xl font-bold">Coaching Assignments</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);