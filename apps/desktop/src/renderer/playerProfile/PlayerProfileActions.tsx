import type { PlayerId, PlayerProfileView, SaveId } from "@cm-clone/contracts";
import { useMemo, useState } from "react";
import {
  useScreenBottomBarActions,
  type ScreenBottomBarActions,
} from "../chrome/bottom-bar/index.js";
import { describeRpcError, scoutingAtom, squadAtom, typedError, useAtomValue } from "../rpc.js";
import { navigateCareer } from "../navigation/adapter.js";
import { ScoutPlayerDialog } from "../scouting/ScoutPlayerDialog.js";
import { setTransferTarget } from "../transfers/transferTarget.js";

export const PlayerProfileActions = ({
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

  const scoutHeldBecause: string | null =
    ownClubId === profile.club.id
      ? `${playerName} is your own player, so there is nothing to scout.`
      : board._tag === "Failure"
        ? boardError === null
          ? "The scouting board could not be loaded."
          : describeRpcError(boardError)
        : scouts !== null && scouts.length === 0
          ? "Your club has no Scouts to send."
          : null;
  const scoutReady = ownClubId !== null && scouts !== null && scoutHeldBecause === null;

  const offerHeldBecause: string | null =
    ownClubId === profile.club.id ? `${playerName} is your own player.` : null;
  const offerReady = ownClubId !== null && offerHeldBecause === null;

  const actions = useMemo(
    (): ScreenBottomBarActions => ({
      buttons: [
        {
          id: "scout-player",
          label: "Scout Player",
          disabled: !scoutReady,
          onTrigger: () => setOpen(true),
        },
        {
          id: "make-offer",
          label: "Make Offer",
          disabled: !offerReady,
          onTrigger: () => {
            setTransferTarget({ playerId });
            navigateCareer({ type: "transfers", saveId }, "keyboard");
          },
        },
      ],
      reason: scoutHeldBecause ?? offerHeldBecause,
    }),
    [scoutReady, scoutHeldBecause, offerReady, offerHeldBecause, playerId],
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