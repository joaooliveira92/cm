/**
 * Individual Training Plan screen (Screen 108) — a per-player sub-surface of the Training area.
 *
 * A player's training plan is their Training Focus (one Category, or None) and their retraining
 * target (one positional line or side, or None). The screen shows the standing Training Focus on a
 * `TrainingPlanSummaryCard` and changes it through `TrainingFocusControl`, which sends the existing
 * `setTrainingFocus` command; `RetrainingControl` sends `setRetrainingTarget`. The current value is
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
import { RetrainingControl } from "./RetrainingControl.js";
import { TrainingFocusControl } from "./TrainingFocusControl.js";
import { TrainingPlanSummaryCard } from "./TrainingPlanSummaryCard.js";
import { trainingViewState } from "./trainingViewState.js";

const PAGE_CLASS = `p-8 text-foreground ${FOCUS_RING.join(" ")}`;

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
        <h1 id="training-plan-heading" className="text-title">
          {name} — Training Plan
        </h1>
        <p className="mt-1 text-body text-text-secondary">
          Choose one Category for this player's Player Development to favour, or None.
        </p>
      </header>

      <div className="mt-6 max-w-2xl">
        <TrainingPlanSummaryCard playerName={name} focus={player.trainingFocus} />
      </div>

      <section className="mt-6" aria-labelledby="training-focus-heading">
        <h2 id="training-focus-heading" className="text-heading">
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

      <section className="mt-6" aria-labelledby="retraining-heading">
        <h2 id="retraining-heading" className="text-heading">
          Retraining
        </h2>
        <p className="mt-1 text-body text-text-secondary">
          Train toward one position or side. Progress is gradual, faster for young and determined
          players, and starts again whenever the target changes.
        </p>
        <div className="mt-3">
          <RetrainingControl saveId={saveId} playerId={player.id} playerName={name} current={player.retrainingTarget} />
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
    <h1 className="text-title">Training Plan</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);
