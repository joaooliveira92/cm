import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import { CATEGORIES } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import {
  describeRpcError,
  playerProfileAtom,
  setTrainingFocusMutation,
  typedError,
  useAtom,
  useAtomValue,
} from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

const CATEGORY_LABELS: Record<string, string> = {
  goalkeeping: "Goalkeeping",
  mental: "Mental",
  physical: "Physical",
  technical: "Technical",
};

export const PlayerDevelopmentScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const profileResult = useAtomValue(playerProfileAtom(saveId, playerId));
  const [_, setFocus] = useAtom(setTrainingFocusMutation);

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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded border px-3 py-1 text-sm hover:bg-active"
            onClick={() => setFocus({ saveId, playerId, focus: null })}
          >
            None
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              className="rounded border px-3 py-1 text-sm hover:bg-active"
              onClick={() => setFocus({ saveId, playerId, focus: category })}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Development History</h2>
        <p className="mt-2 text-sm text-text-secondary italic">
          Development tracking (per-season attribute changes) will be available in a future update.
          Player Development runs once per Season Concluded, independently per player, deterministically.
        </p>
      </section>
    </main>
  );
};