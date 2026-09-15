/**
 * Training Overview screen (Screen 105) — the central landing page for the Training area.
 *
 * Aggregates summary cards from each sub-surface: Coaching Assignments (111), Workload and
 * Recovery (112), Individual Training Plan (108), Performance Report (113), and Player
 * Development Centre (114). Each card links to its respective detail screen.
 *
 * ## States
 *
 * - `loading` — one or more reads are in flight.
 * - `ready` — all cards rendered from loaded data.
 * - `error` — one or more reads failed (save not found, transport error).
 *
 * Reached from the career chrome's Training tab (`g 3`) at `/career/$saveId/training`.
 */
import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import {
  coachingAssignmentsAtom,
  describeRpcError,
  squadDevelopmentAtom,
  typedError,
  useAtomValue,
  workloadAtom,
} from "../rpc.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { CoachCard } from "./CoachCard.js";
import { describeLatestDevelopment } from "./developmentIndicator.js";
import { displayCondition, recoveryStatus } from "./recoveryStatus.js";
import type { TrainingFocusValue } from "./trainingFocusOptions.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

const MAX_COACH_PREVIEW = 3;
const MAX_PLAYER_PREVIEW = 3;

export const TrainingScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const coachingResult = useAtomValue(coachingAssignmentsAtom(saveId));
  const workloadResult = useAtomValue(workloadAtom(saveId));
  const developmentResult = useAtomValue(squadDevelopmentAtom(saveId));

  // Collect the first error among the three independent reads.
  const firstError =
    coachingResult._tag === "Failure"
      ? typedError(coachingResult)
      : workloadResult._tag === "Failure"
        ? typedError(workloadResult)
        : developmentResult._tag === "Failure"
          ? typedError(developmentResult)
          : null;

  const renderedError =
    firstError !== null
      ? firstError !== null
        ? describeRpcError(firstError)
        : null
      : null;

  if (coachingResult._tag === "Initial" || workloadResult._tag === "Initial" || developmentResult._tag === "Initial") {
    return <TrainingMessage message="Loading training overview..." />;
  }

  if (coachingResult._tag === "Failure" || workloadResult._tag === "Failure" || developmentResult._tag === "Failure") {
    return (
      <TrainingMessage
        message={renderedError ?? "Training data could not be loaded."}
      />
    );
  }

  const coaches = coachingResult.value.coaches;
  const players = workloadResult.value.players;
  const developmentPlayers = developmentResult.value.players;

  const restingCount = players.filter((p: { readonly recovery: string }) => p.recovery === "rest").length;
  const withChanges = developmentPlayers.filter(
    (p: { readonly latestSeason: { readonly changes: ReadonlyArray<unknown> } | null }) =>
      p.latestSeason !== null && p.latestSeason.changes.length > 0,
  ).length;

  return (
    <main
      id="training-overview-page"
      data-focus-id="training"
      aria-labelledby="training-overview-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="training-overview-heading" className="text-2xl font-bold">
          Training Overview
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Team training, workload, and player development at a glance
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Coaching Assignments card */}
        <section
          aria-labelledby="coaching-summary-heading"
          className="rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
        >
          <h2 id="coaching-summary-heading" className="text-lg font-semibold">
            Coaching Staff
          </h2>
          {coaches.length === 0 ? (
            <p className="mt-2 text-sm italic text-text-secondary">No coaching staff assigned yet.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-text-secondary">
                {coaches.length} {coaches.length === 1 ? "coach" : "coaches"} on staff
              </p>
              <ul className="mt-3 space-y-2" aria-label="Coach preview">
                {coaches.slice(0, MAX_COACH_PREVIEW).map((coach: { readonly id: string; readonly name: string; readonly quality: number; readonly department: string }) => (
                  <CoachCard key={coach.id} name={coach.name} quality={coach.quality} department={coach.department} />
                ))}
                {coaches.length > MAX_COACH_PREVIEW && (
                  <p className="text-xs text-text-secondary italic">
                    +{coaches.length - MAX_COACH_PREVIEW} more
                  </p>
                )}
              </ul>
            </>
          )}
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              aria-label="View all coaching assignments"
              onClick={(event) =>
                navigateCareer({ type: "trainingCoaching", saveId }, intentOfClick(event))
              }
            >
              View coaching assignments
            </Button>
          </div>
        </section>

        {/* Workload and Recovery card */}
        <section
          aria-labelledby="workload-summary-heading"
          className="rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
        >
          <h2 id="workload-summary-heading" className="text-lg font-semibold">
            Workload and Recovery
          </h2>
          {players.length === 0 ? (
            <p className="mt-2 text-sm italic text-text-secondary">No players in your squad.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-text-secondary">
                {restingCount} {restingCount === 1 ? "player needs" : "players need"} rest
              </p>
              <ul className="mt-3 space-y-2" aria-label="Workload preview">
                {players.slice(0, MAX_PLAYER_PREVIEW).map(
                  (player: { readonly id: string; readonly firstName: string; readonly lastName: string; readonly condition: number; readonly recovery: "rest" | "active"; readonly lastInjurySeverity: "none" | "light" | "medium" | "severe" }) => {
                    const name = `${player.firstName} ${player.lastName}`;
                    const value = displayCondition(player.condition);
                    const status = recoveryStatus(player.recovery, player.lastInjurySeverity);
                    return (
                      <li key={player.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-text-primary">{name}</span>
                        <span className="tabular-nums text-text-secondary">{value}% — {status.label}</span>
                      </li>
                    );
                  },
                )}
                {players.length > MAX_PLAYER_PREVIEW && (
                  <p className="text-xs text-text-secondary italic">
                    +{players.length - MAX_PLAYER_PREVIEW} more
                  </p>
                )}
              </ul>
            </>
          )}
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              aria-label="View workload and recovery details"
              onClick={(event) =>
                navigateCareer({ type: "trainingWorkload", saveId }, intentOfClick(event))
              }
            >
              View workload details
            </Button>
          </div>
        </section>

        {/* Training Plans card */}
        <section
          aria-labelledby="plans-summary-heading"
          className="rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
        >
          <h2 id="plans-summary-heading" className="text-lg font-semibold">
            Training Plans
          </h2>
          {developmentPlayers.length === 0 ? (
            <p className="mt-2 text-sm italic text-text-secondary">No players in your squad.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-text-secondary">
                {developmentPlayers.length} {developmentPlayers.length === 1 ? "player" : "players"}
              </p>
              <ul className="mt-3 space-y-2" aria-label="Training plan preview">
                {developmentPlayers.slice(0, MAX_PLAYER_PREVIEW).map(
                  (player: { readonly id: string; readonly firstName: string; readonly lastName: string; readonly trainingFocus: TrainingFocusValue }) => {
                    const name = `${player.firstName} ${player.lastName}`;
                    return (
                      <li key={player.id}>
                        <div className="rounded-panel border border-panel-border bg-card p-3 text-card-foreground shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="truncate text-base font-semibold text-text-primary">{name}</h3>
                            <span className="rounded-control bg-panel-bg px-2 py-0.5 text-sm font-medium text-text-secondary">
                              {describeFocus(player.trainingFocus)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            aria-label={`${name} training plan`}
                            className="mt-2"
                            onClick={(event) =>
                              navigateCareer(
                                { type: "trainingPlan", saveId, playerId: player.id as PlayerId },
                                intentOfClick(event),
                              )
                            }
                          >
                            Training plan
                          </Button>
                        </div>
                      </li>
                    );
                  },
                )}
                {developmentPlayers.length > MAX_PLAYER_PREVIEW && (
                  <p className="text-xs text-text-secondary italic">
                    +{developmentPlayers.length - MAX_PLAYER_PREVIEW} more players
                  </p>
                )}
              </ul>
            </>
          )}
        </section>

        {/* Player Development Centre card */}
        <section
          aria-labelledby="development-summary-heading"
          className="rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
        >
          <h2 id="development-summary-heading" className="text-lg font-semibold">
            Player Development
          </h2>
          {developmentPlayers.length === 0 ? (
            <p className="mt-2 text-sm italic text-text-secondary">No development data yet.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-text-secondary">
                {withChanges} {withChanges === 1 ? "player has" : "players have"} Attribute changes
              </p>
              <ul className="mt-3 space-y-2" aria-label="Development preview">
                {developmentPlayers.slice(0, MAX_PLAYER_PREVIEW).map(
                  (player: {
                    readonly id: string;
                    readonly firstName: string;
                    readonly lastName: string;
                    readonly latestSeason: {
                      readonly seasonNumber: number;
                      readonly comparedWithSeason: number | null;
                      readonly changes: ReadonlyArray<{ readonly from: number; readonly to: number }>;
                    } | null;
                  }) => {
                    const description = player.latestSeason === null
                      ? "No comparison yet"
                      : describeLatestDevelopment(player.latestSeason);
                    return (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium text-text-primary">
                          {player.firstName} {player.lastName}
                        </span>
                        <p className="text-text-secondary">{description}</p>
                      </li>
                    );
                  },
                )}
                {developmentPlayers.length > MAX_PLAYER_PREVIEW && (
                  <p className="text-xs text-text-secondary italic">
                    +{developmentPlayers.length - MAX_PLAYER_PREVIEW} more
                  </p>
                )}
              </ul>
            </>
          )}
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              aria-label="View full development centre"
              onClick={(event) =>
                navigateCareer({ type: "trainingDevelopment", saveId }, intentOfClick(event))
              }
            >
              View development centre
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};

/** The Training Focus label displayed on the plan summary. */
const describeFocus = (focus: TrainingFocusValue): string =>
  focus === null ? "None" : focus.charAt(0).toUpperCase() + focus.slice(1);

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line. */
const TrainingMessage = ({ message }: { readonly message: string }) => (
  <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="training" aria-label="Training overview">
    <h1 className="text-2xl font-bold">Training Overview</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);