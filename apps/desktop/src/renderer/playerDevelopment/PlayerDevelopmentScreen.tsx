/**
 * Player Development (Screen 61) — the third player tab: the player's standing Training Focus and
 * where their recorded per-season Attribute changes are read.
 *
 * Shares the player header and tab strip with Profile and Information so the three read as one
 * screen switching bodies, the way CM's player screen did.
 */
import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import { offeredTrainingFocuses } from "@cm-clone/shared";
import { PlayerNotePanel } from "../player/panels.js";
import { PlayerScreenFrame } from "../player/PlayerScreenFrame.js";
import { describeRpcError, squadAtom, typedError, useAtomValue } from "../rpc.js";
import { TrainingFocusControl } from "../training/TrainingFocusControl.js";

export const PlayerDevelopmentScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => (
  <PlayerScreenFrame saveId={saveId} playerId={playerId} tab="playerDevelopment">
    {() => (
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PlayerNotePanel title="Training Focus">
          <p className="text-sm text-text-body">
            Set a training focus to bias Player Development for one Category this season.
          </p>
          <div className="mt-3">
            <TrainingFocusSection saveId={saveId} playerId={playerId} />
          </div>
        </PlayerNotePanel>
        <PlayerNotePanel title="Development History">
          <p className="text-sm text-text-body">
            Per-season Attribute changes are on this player&apos;s Performance Report. Player
            Development runs once per Season Concluded, independently per player, deterministically.
          </p>
        </PlayerNotePanel>
      </div>
    )}
  </PlayerScreenFrame>
);

/**
 * The Training Focus section's body. The player profile read carries no Training Focus, so the
 * current value comes from the own-club squad read — the same one the Individual Training Plan
 * (Screen 108) uses. A player outside that squad is not the manager's to focus.
 */
const TrainingFocusSection = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const squadResult = useAtomValue(squadAtom(saveId));
  if (squadResult._tag === "Initial") {
    return <p className="text-sm text-text-secondary">Loading Training Focus...</p>;
  }
  if (squadResult._tag === "Failure") {
    const error = typedError(squadResult);
    return (
      <p className="text-sm text-text-secondary">
        {error === null ? "Training Focus could not be loaded." : describeRpcError(error)}
      </p>
    );
  }
  const player = squadResult.value.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) {
    return (
      <p className="text-sm text-text-secondary">
        Training Focus can only be set for players on your club.
      </p>
    );
  }
  return (
    <TrainingFocusControl
      saveId={saveId}
      playerId={player.id}
      playerName={`${player.firstName} ${player.lastName}`}
      current={player.trainingFocus}
      offered={offeredTrainingFocuses(player.attributes)}
    />
  );
};
