/**
 * Player Development Centre (Screen 114) — the squad-wide development view, a sub-surface of the
 * Training area.
 *
 * Lists every player on the manager's own club with a `TrainingPlanSummaryCard` for their standing
 * Training Focus, and a development indicator for their newest recorded Season: how many visible
 * Attributes rose and fell against the previous recorded Season. The data is one read,
 * `getSquadDevelopment`, over the same `PlayerDeveloped` events the Performance Report reads; main
 * derives the comparison and this screen only counts and words it (`developmentIndicator.ts`).
 *
 * ## States
 *
 * - `loading` — the read is in flight.
 * - `ready` — one row per player; an empty club shows a single line instead.
 * - `error` — the read failed (save not found, transport error).
 *
 * Each row carries two actions: "Development", opening the player's Player Development screen, and
 * "Training plan", opening their Individual Training Plan (Screen 108). Reached from the Coaching
 * Assignments screen's "Player development" button at `/career/$saveId/training/development-centre`;
 * it registers under the `training` screen scope, as Workload and Recovery does.
 */
import { type SaveId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  describeRpcError,
  squadDevelopmentAtom,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { describeLatestDevelopment } from "./developmentIndicator.js";
import { TrainingPlanSummaryCard } from "./TrainingPlanSummaryCard.js";
import { trainingViewState } from "./trainingViewState.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const DevelopmentCentreScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(squadDevelopmentAtom(saveId));
  const state = trainingViewState(result);

  if (state === "error") {
    return <DevelopmentCentreMessage message={messageOf(typedError(result))} />;
  }
  if (state === "loading" || result._tag !== "Success") {
    return <DevelopmentCentreMessage message="Loading player development..." />;
  }

  const { players } = result.value;
  if (players.length === 0) {
    return <DevelopmentCentreMessage message="No players in your squad." />;
  }

  return (
    <main
      id="development-centre-page"
      data-focus-id="training"
      aria-labelledby="development-centre-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="development-centre-heading" className="text-2xl font-bold">
          Player Development Centre
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Each player's Training Focus and the Attribute changes recorded when their latest Season concluded
        </p>
      </header>

      <ul className="mt-6 grid gap-3 lg:grid-cols-2" aria-label="Squad development">
        {players.map((player) => {
          const name = `${player.firstName} ${player.lastName}`;
          return (
            <li key={player.id} aria-label={name}>
              <TrainingPlanSummaryCard playerName={name} focus={player.trainingFocus}>
                <p className="mt-3 text-sm text-text-primary">{describeLatestDevelopment(player.latestSeason)}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`${name} development`}
                    onClick={(event) =>
                      navigateCareer(
                        { type: "playerDevelopment", saveId, playerId: player.id },
                        intentOfClick(event),
                      )
                    }
                  >
                    Development
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`${name} training plan`}
                    onClick={(event) =>
                      navigateCareer(
                        { type: "trainingPlan", saveId, playerId: player.id },
                        intentOfClick(event),
                      )
                    }
                  >
                    Training plan
                  </Button>
                </div>
              </TrainingPlanSummaryCard>
            </li>
          );
        })}
      </ul>
    </main>
  );
};

/** The sentence a failed read shows. A defect-only cause carries no typed error, so it falls back
 *  to the generic line. */
const messageOf = (error: RpcClientError<"getSquadDevelopment"> | null): string =>
  error === null ? "Player development could not be loaded." : describeRpcError(error);

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line. */
const DevelopmentCentreMessage = ({ message }: { readonly message: string }) => (
  <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="training" aria-label="Player development centre">
    <h1 className="text-2xl font-bold">Player Development Centre</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);
