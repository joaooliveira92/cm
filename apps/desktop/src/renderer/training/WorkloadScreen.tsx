/**
 * Workload and Recovery screen (Screen 112) — a sub-surface of the Training area.
 *
 * Lists every player on the manager's own club with a `WorkloadGauge`: current Condition, the
 * Rest/Active indicator, and the recovery detail. The data is the existing fitness ledger read
 * through `getWorkload`; main derives the Rest/Active indicator on every read, never stored.
 *
 * ## States
 *
 * - `loading` — the read is in flight.
 * - `ready` — one row per player; an empty club shows a single line instead.
 * - `error` — the read failed (save not found, transport error).
 *
 * Each row's one action is a "Training plan" button opening that player's Individual Training Plan
 * (Screen 108); rows themselves take no focus. Reached from the Coaching Assignments
 * screen's "Workload and recovery" button at `/career/$saveId/training/workload`; it registers under
 * the `training` screen scope, as the tactics editor does under `tactics`.
 */
import { type SaveId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  describeRpcError,
  typedError,
  useAtomValue,
  workloadAtom,
  type RpcClientError,
} from "../rpc.js";
import { trainingViewState } from "./trainingViewState.js";
import { WorkloadGauge } from "./WorkloadGauge.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const WorkloadScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(workloadAtom(saveId));
  const state = trainingViewState(result);

  if (state === "error") {
    return <WorkloadMessage message={messageOf(typedError(result))} />;
  }
  if (state === "loading" || result._tag !== "Success") {
    return <WorkloadMessage message="Loading workload and recovery..." />;
  }

  const { players } = result.value;
  if (players.length === 0) {
    return <WorkloadMessage message="No players in your squad." />;
  }

  return (
    <main
      id="workload-page"
      data-focus-id="training"
      aria-labelledby="workload-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="workload-heading" className="text-2xl font-bold">
          Workload and Recovery
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Each player's Condition and whether they need rest
        </p>
      </header>

      <ul className="mt-6 space-y-3" aria-label="Player workload">
        {players.map((player) => {
          const name = `${player.firstName} ${player.lastName}`;
          return (
            <li
              key={player.id}
              aria-label={name}
              className="grid grid-cols-[minmax(10rem,16rem)_1fr_auto] items-center gap-6 rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
            >
              <span className="truncate font-semibold text-text-primary">{name}</span>
              <WorkloadGauge
                playerName={name}
                condition={player.condition}
                recovery={player.recovery}
                lastInjurySeverity={player.lastInjurySeverity}
              />
              <Button
                type="button"
                variant="secondary"
                aria-label={`${name} training plan`}
                onClick={(event) =>
                  navigateCareer(
                    { type: "trainingPlan", saveId, playerId: player.id },
                    intentOfClick(event),
                  )
                }
              >
                Training plan
              </Button>
            </li>
          );
        })}
      </ul>
    </main>
  );
};

/** The sentence a failed read shows. A defect-only cause carries no typed error, so it falls back
 *  to the generic line. */
const messageOf = (error: RpcClientError<"getWorkload"> | null): string =>
  error === null ? "Workload and recovery could not be loaded." : describeRpcError(error);

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line. */
const WorkloadMessage = ({ message }: { readonly message: string }) => (
  <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="training" aria-label="Workload and recovery">
    <h1 className="text-2xl font-bold">Workload and Recovery</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);
