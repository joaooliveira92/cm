import type { PlayerId, SaveId } from "@cm-clone/contracts";
import type { Category } from "@cm-clone/shared";
import { useState } from "react";
import {
  describeRpcError,
  setTrainingFocusMutation,
  typedError,
  useAtom,
  type RpcClientError,
} from "../rpc.js";
import { TrainingFocusPicker } from "./TrainingFocusPicker.js";
import type { TrainingFocusValue } from "./trainingFocusOptions.js";

/**
 * The Training Focus picker wired to the `setTrainingFocus` command, with its pending and error
 * feedback. Used by the Individual Training Plan (Screen 108) and Player Development.
 *
 * The pressed value is `current`, the Training Focus the host read from main. This component keeps
 * only which player it last sent a command for: the mutation atom is shared across every player, so
 * a pending or failed command for another player must not surface here. Once a command succeeds,
 * its invalidation refreshes the host's read, and that read moves the pressed button.
 */
export const TrainingFocusControl = ({
  saveId,
  playerId,
  playerName,
  current,
  offered,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly current: TrainingFocusValue;
  readonly offered: ReadonlyArray<Category>;
}) => {
  const [result, setFocus] = useAtom(setTrainingFocusMutation);
  const [sentFor, setSentFor] = useState<PlayerId | null>(null);

  const mine = sentFor === playerId;
  const pending = mine && result.waiting;
  const failed = mine && !result.waiting && result._tag === "Failure";
  const failure = failed ? messageOf(typedError(result)) : null;

  return (
    <div className="flex flex-col gap-2">
      <TrainingFocusPicker
        playerName={playerName}
        current={current}
        offered={offered}
        disabled={pending}
        onSelect={(focus) => {
          setSentFor(playerId);
          setFocus({ saveId, playerId, focus });
        }}
      />
      {pending ? (
        <p role="status" className="text-sm text-text-secondary">
          Saving Training Focus...
        </p>
      ) : null}
      {failure === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
    </div>
  );
};

/** The sentence a failed command shows. A defect-only cause carries no typed error, so it falls back
 *  to the generic line. */
const messageOf = (error: RpcClientError<"setTrainingFocus"> | null): string =>
  error === null ? "Training Focus could not be saved." : describeRpcError(error);
