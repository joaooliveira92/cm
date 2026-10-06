/**
 * The Profile's Scout Player verb (group-i 13): a secondary in the career bar, beside Continue,
 * that opens the Scout picker for the Player on screen.
 *
 * It is held, with the reason in the bar, when scouting could tell the manager nothing (their own
 * Player, read exactly already) or when there is nobody to send. The Player's club is compared with
 * the manager's from the squad read, the way Scouting Assignment keeps the manager's own club out
 * of its targets.
 */
import type { PlayerId, PlayerProfileView, SaveId } from "@cm-clone/contracts";
import { useMemo, useState } from "react";
import {
  useScreenBottomBarActions,
  type ScreenBottomBarActions,
} from "../chrome/bottom-bar/index.js";
import { describeRpcError, scoutingAtom, squadAtom, typedError, useAtomValue } from "../rpc.js";
import { ScoutPlayerDialog } from "../scouting/ScoutPlayerDialog.js";

export const ScoutPlayerAction = ({
  saveId,
  playerId,
  profile,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
  readonly profile: PlayerProfileView;
}) => {
  const squad = useAtomValue(squadAtom(saveId));
  const board = useAtomValue(scoutingAtom(saveId));
  const [open, setOpen] = useState(false);

  const playerName = `${profile.firstName} ${profile.lastName}`;
  const ownClubId = squad._tag === "Success" ? squad.value.club.id : null;
  const scouts = board._tag === "Success" ? board.value.scouts : null;
  const boardError = typedError(board);

  // Null while a read is still loading: the verb is held without a reason, because nothing is
  // wrong yet.
  const heldBecause: string | null =
    ownClubId === profile.club.id
      ? `${playerName} is your own player, so there is nothing to scout.`
      : board._tag === "Failure"
        ? boardError === null
          ? "The scouting board could not be loaded."
          : describeRpcError(boardError)
        : scouts !== null && scouts.length === 0
          ? "Your club has no Scouts to send."
          : null;
  const ready = ownClubId !== null && scouts !== null && heldBecause === null;

  const actions = useMemo(
    (): ScreenBottomBarActions => ({
      buttons: [
        {
          id: "scout-player",
          label: "Scout Player",
          disabled: !ready,
          onTrigger: () => setOpen(true),
        },
      ],
      reason: heldBecause,
    }),
    [ready, heldBecause],
  );
  useScreenBottomBarActions(actions);

  return scouts === null ? null : (
    <ScoutPlayerDialog
      saveId={saveId}
      playerId={playerId}
      playerName={playerName}
      scouts={scouts}
      open={open}
      onOpenChange={setOpen}
    />
  );
};
