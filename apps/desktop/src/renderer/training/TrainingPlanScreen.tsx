/**
 * Individual Training Plan screen (Screen 108) — a per-player sub-surface of the Training area.
 *
 * In v1 a player's training plan is their Training Focus: one Category, or None. The screen shows
 * the standing Training Focus on a `TrainingPlanSummaryCard` and changes it through
 * `TrainingFocusControl`, which sends the existing `setTrainingFocus` command. The current value is
 * read from `getSquad`, whose `trainingFocus` that command's invalidation refreshes, so no read is
 * added for this screen.
 *
 * ## States
 *
 * - `loading` — the squad read is in flight.
 * - `ready` — the player is on the manager's own club: summary card plus picker.
 * - `not-own-player` — the id names no player in the own squad; Training Focus is only set for them.
 * - `error` — the read failed (save not found, transport error).
 *
 * Reached from each player row's "Training plan" button on Workload and Recovery, at
 * `/career/$saveId/training/plan/$playerId`; it registers under the `training` screen scope.
 */
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { offeredTrainingFocuses } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import {
  describeRpcError,
  squadAtom,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { TrainingFocusControl } from "./TrainingFocusControl.js";
import { TrainingPlanSummaryCard } from "./TrainingPlanSummaryCard.js";
import { trainingViewState } from "./trainingViewState.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const TrainingPlanScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const result = useAtomValue(squadAtom(saveId));
  const state = trainingViewState(result);

  if (state === "error") {
    return <TrainingPlanMessage message={messageOf(typedError(result))} />;
  }
  if (state === "loading" || result._tag !== "Success") {
    return <TrainingPlanMessage message="Loading training plan..." />;
  }

  const player = result.value.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) {
    return (
      <TrainingPlanMessage message="That player does not belong to your club. Training Focus can only be set for your own players." />
    );
  }

  const name = `${player.firstName} ${player.lastName}`;

  return (
    <main
      data-focus-id="training"
      aria-labelledby="training-plan-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="training-plan-heading" className="text-2xl font-bold">
          {name} — Training Plan
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Choose one Category for this player's Player Development to favour, or None.
        </p>
      </header>

      <div className="mt-6 max-w-2xl">
        <TrainingPlanSummaryCard playerName={name} focus={player.trainingFocus} />
      </div>

      <section className="mt-6" aria-labelledby="training-focus-heading">
        <h2 id="training-focus-heading" className="text-lg font-semibold">
          Training Focus
        </h2>
        <div className="mt-3">
          <TrainingFocusControl
            saveId={saveId}
            playerId={player.id}
            playerName={name}
            current={player.trainingFocus}
            offered={offeredTrainingFocuses(player.attributes)}
          />
        </div>
      </section>
    </main>
  );
};

/** The sentence a failed read shows. A defect-only cause carries no typed error, so it falls back
 *  to the generic line. */
const messageOf = (error: RpcClientError<"getSquad"> | null): string =>
  error === null ? "The training plan could not be loaded." : describeRpcError(error);

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line. */
const TrainingPlanMessage = ({ message }: { readonly message: string }) => (
  <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="training" aria-label="Training plan">
    <h1 className="text-2xl font-bold">Training Plan</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);
