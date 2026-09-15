import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import {
  describeRpcError,
  playerProfileAtom,
  squadAtom,
  typedError,
  useAtomValue,
} from "../rpc.js";
import { TrainingFocusControl } from "../training/TrainingFocusControl.js";
import { offeredTrainingFocuses } from "../training/trainingFocusOptions.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const PlayerDevelopmentScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const profileResult = useAtomValue(playerProfileAtom(saveId, playerId));

  if (profileResult._tag === "Initial") {
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="playerDevelopment" aria-label="Player Development">
        <h1 className="text-2xl font-bold">Player Development</h1>
        <p className="mt-4 text-text-secondary">Loading player data...</p>
      </main>
    );
  }

  if (profileResult._tag === "Failure") {
    const error = typedError(profileResult);
    const message = error === null ? "Player data could not be loaded." : describeRpcError(error);
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="playerDevelopment" aria-label="Player Development">
        <h1 className="text-2xl font-bold">Player Development</h1>
        <p className="mt-4 text-text-secondary">{message}</p>
      </main>
    );
  }

  const profile = profileResult.value;

  return (
    <main
      className={PAGE_CLASS}
      tabIndex={-1}
      data-focus-id="playerDevelopment"
      aria-label={`${profile.firstName} ${profile.lastName} - Development`}
    >
      <h1 className="text-2xl font-bold">
        {profile.firstName} {profile.lastName} — Development
      </h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Training Focus</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Set a training focus to bias Player Development for one Category this season.
        </p>
        <div className="mt-3">
          <TrainingFocusSection saveId={saveId} playerId={playerId} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Development History</h2>
        <p className="mt-2 text-sm text-text-secondary italic">
          Per-season Attribute changes are on this player's Performance Report.
          Player Development runs once per Season Concluded, independently per player, deterministically.
        </p>
      </section>
    </main>
  );
};

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
