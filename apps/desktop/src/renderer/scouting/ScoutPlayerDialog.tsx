/**
 * The Scout picker for one Player (group-i 13): the Player-target twin of `AssignScoutPanel`.
 *
 * Every Scout is listed, busy ones included, because redirecting a Scout is a legitimate move and
 * the manager should see what they would be taking the Scout away from (the command's own doc says
 * as much). A refusal is shown as the RPC's own sentence and leaves the picker open; success closes
 * it. Nothing reloads by hand: the mutation invalidates the scouting key, which every scouting read
 * follows.
 */
import type { PlayerId, SaveId, ScoutingView } from "@cm-clone/contracts";
import { useState } from "react";
import { Button } from "../components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../components/ui/dialog.js";
import {
  assignScoutMutation,
  describeRpcError,
  useAtomSet,
  type RpcClientError,
} from "../rpc.js";
import { statusOf } from "./AssignScoutPanel.js";

export const ScoutPlayerDialog = ({
  saveId,
  playerId,
  playerName,
  scouts,
  open,
  onOpenChange,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly scouts: ScoutingView["scouts"];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) => {
  const assign = useAtomSet(assignScoutMutation, { mode: "promise" });
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const changeOpen = (next: boolean) => {
    // A refusal belongs to the attempt it answered, not to the next time the picker opens.
    if (!next) setFailure(null);
    onOpenChange(next);
  };

  const onAssign = async (scoutId: string) => {
    setPending(scoutId);
    setFailure(null);
    try {
      await assign({ saveId, scoutId, playerId });
      changeOpen(false);
    } catch (error) {
      const typed = error as RpcClientError<"assignScout"> | undefined;
      setFailure(typed?._tag === undefined ? "The scout could not be assigned." : describeRpcError(typed));
    }
    setPending(null);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="w-full max-w-lg p-4">
        <DialogTitle className="text-text-primary">Scout {playerName}</DialogTitle>
        <DialogDescription className="mt-1 text-text-secondary">
          Choose a Scout to watch this player. A Scout busy elsewhere leaves that assignment; progress
          already made stays with the club.
        </DialogDescription>

        {failure !== null && (
          <p role="alert" className="mt-3 text-body text-text-danger">
            {failure}
          </p>
        )}

        <ul aria-label="Scouts" className="mt-3 text-body">
          {scouts.map((scout) => (
            <li key={scout.scoutId} className="flex items-center gap-3 py-1">
              <span className="w-40 truncate font-medium">{scout.scoutName}</span>
              <span className="min-w-0 flex-1 truncate text-text-secondary">
                {scout.playerId === playerId ? "Watching this player" : statusOf(scout)}
              </span>
              {scout.playerId !== playerId && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending !== null}
                  aria-label={`Assign ${scout.scoutName}`}
                  onClick={() => void onAssign(scout.scoutId)}
                >
                  {pending === scout.scoutId ? "Assigning…" : "Assign"}
                </Button>
              )}
            </li>
          ))}
        </ul>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => changeOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
