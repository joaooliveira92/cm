/**
 * The retraining picker on the Individual Training Plan: the one positional line or side the
 * manager is training this player toward, or None. Sends `setRetrainingTarget`; the current value is
 * the host's squad read, which the command's invalidation refreshes. Like `TrainingFocusControl`,
 * it remembers only which player it last sent a command for, since the mutation atom is shared.
 *
 * Offers lines and sides by name, never the ratings behind them: no screen shows raw positional
 * ratings. See `.agents/notes/proposed/feature/2026-09-29-positions-retrain-through-training-only.md`.
 */
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import type { RetrainingTarget } from "@cm-clone/shared";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { describeRpcError, setRetrainingTargetMutation, typedError, useAtom, type RpcClientError } from "../rpc.js";

const NONE = "none";

const TARGET_LABELS: ReadonlyArray<{ readonly value: RetrainingTarget; readonly label: string }> = [
  { value: "GK", label: "Goalkeeper" },
  { value: "SW", label: "Sweeper" },
  { value: "D", label: "Defender" },
  { value: "WB", label: "Wing Back" },
  { value: "DM", label: "Defensive Midfielder" },
  { value: "M", label: "Midfielder" },
  { value: "AM", label: "Attacking Midfielder" },
  { value: "F", label: "Forward" },
  { value: "R", label: "Right side" },
  { value: "L", label: "Left side" },
  { value: "C", label: "Centre" },
];

const ITEMS = [{ value: NONE, label: "None" }, ...TARGET_LABELS];

export const RetrainingControl = ({
  saveId,
  playerId,
  playerName,
  current,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly current: RetrainingTarget | null;
}) => {
  const [result, setTarget] = useAtom(setRetrainingTargetMutation);
  const [sentFor, setSentFor] = useState<PlayerId | null>(null);

  const mine = sentFor === playerId;
  const pending = mine && result.waiting;
  const failure = mine && !result.waiting && result._tag === "Failure" ? messageOf(typedError(result)) : null;

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={current ?? NONE}
        items={ITEMS}
        disabled={pending}
        onValueChange={(value) => {
          if (value === null) return;
          setSentFor(playerId);
          setTarget({ saveId, playerId, target: value === NONE ? null : (value as RetrainingTarget) });
        }}
      >
        <SelectTrigger data-action-id="set-retraining-target" aria-label={`Retrain ${playerName} toward`} className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <p role="status" className="text-body text-text-secondary">
          Saving retraining target...
        </p>
      ) : null}
      {failure === null ? null : (
        <p role="alert" className="text-body text-destructive">
          {failure}
        </p>
      )}
    </div>
  );
};

const messageOf = (error: RpcClientError<"setRetrainingTarget"> | null): string =>
  error === null ? "The retraining target could not be saved." : describeRpcError(error);
