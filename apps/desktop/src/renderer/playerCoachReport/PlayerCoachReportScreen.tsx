/**
 * Performance Report screen (Screen 113) — the per-player coach report route.
 *
 * Shows one own-club player's standing Training Focus and their recorded development progress:
 * the Attribute changes each concluded Season's Player Development left behind. The focus comes
 * from `getSquad` (the same read the Individual Training Plan uses) and is shown on the shared
 * `TrainingPlanSummaryCard`; the progress comes from `getPlayerDevelopmentHistory`, which main
 * derives from the club's `PlayerDeveloped` events. Nothing here computes development.
 *
 * ## States
 *
 * - `loading` — the squad read is in flight.
 * - `ready` — the player is on the manager's club: focus card, then the progress section, which
 *   has its own loading/error line and an empty state before any Season has concluded.
 * - `not-own-player` — the id names no player in the own squad; the report covers own players only.
 * - `error` — the squad read failed.
 *
 * Mounted at `/career/$saveId/player/$playerId/coach-report` under the `playerCoachReport` scope.
 */
import type { PlayerDevelopmentHistoryView, PlayerId, SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import {
  describeRpcError,
  playerDevelopmentHistoryAtom,
  squadAtom,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { TrainingPlanSummaryCard } from "../training/TrainingPlanSummaryCard.js";
import { trainingViewState } from "../training/trainingViewState.js";
import { describeAttributeChange, describeComparison } from "./developmentProgress.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const PlayerCoachReportScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const result = useAtomValue(squadAtom(saveId));
  const state = trainingViewState(result);

  if (state === "error") {
    return <ReportMessage message={messageOf(typedError(result))} />;
  }
  if (state === "loading" || result._tag !== "Success") {
    return <ReportMessage message="Loading performance report..." />;
  }

  const player = result.value.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) {
    return (
      <ReportMessage message="That player does not belong to your club. The performance report covers your own players." />
    );
  }

  const name = `${player.firstName} ${player.lastName}`;

  return (
    <main
      tabIndex={-1}
      data-focus-id="playerCoachReport"
      aria-labelledby="performance-report-heading"
      className={PAGE_CLASS}
    >
      <h1 id="performance-report-heading" className="text-2xl font-bold">
        {name} — Performance Report
      </h1>

      <section className="mt-6 max-w-2xl" aria-labelledby="report-focus-heading">
        <h2 id="report-focus-heading" className="text-lg font-semibold">
          Training Focus
        </h2>
        <div className="mt-3">
          <TrainingPlanSummaryCard playerName={name} focus={player.trainingFocus} />
        </div>
      </section>

      <section className="mt-8 max-w-2xl" aria-labelledby="report-progress-heading">
        <h2 id="report-progress-heading" className="text-lg font-semibold">
          Development Progress
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          The Attribute changes Player Development recorded when each Season concluded.
        </p>
        <div className="mt-3">
          <DevelopmentProgress saveId={saveId} playerId={playerId} />
        </div>
      </section>
    </main>
  );
};

const DevelopmentProgress = ({ saveId, playerId }: { readonly saveId: SaveId; readonly playerId: PlayerId }) => {
  const result = useAtomValue(playerDevelopmentHistoryAtom(saveId, playerId));
  if (result._tag === "Initial") {
    return <p className="text-sm text-text-secondary">Loading development progress...</p>;
  }
  if (result._tag === "Failure") {
    const error = typedError(result);
    return (
      <p className="text-sm text-text-secondary">
        {error === null ? "Development progress could not be loaded." : describeRpcError(error)}
      </p>
    );
  }
  return <SeasonList history={result.value} />;
};

const SeasonList = ({ history }: { readonly history: PlayerDevelopmentHistoryView }) => {
  if (history.seasons.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No Season has concluded with this player at your club yet, so no development is recorded.
      </p>
    );
  }
  return (
    <ol aria-label="Development by Season" className="space-y-4">
      {history.seasons.map((season) => (
        <li
          key={season.seasonNumber}
          aria-labelledby={`season-${season.seasonNumber}-heading`}
          className="rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel"
        >
          <h3 id={`season-${season.seasonNumber}-heading`} className="text-base font-semibold">
            Season {season.seasonNumber}
          </h3>
          <p className="mt-1 text-xs text-text-secondary">{describeComparison(season)}</p>
          {season.changes.length > 0 ? (
            <ul aria-label={`Season ${season.seasonNumber} Attribute changes`} className="mt-2 space-y-1 text-sm">
              {season.changes.map((change) => (
                <li key={change.attribute} className="tabular-nums">
                  {describeAttributeChange(change)}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

/** The sentence a failed squad read shows. A defect-only cause carries no typed error. */
const messageOf = (error: RpcClientError<"getSquad"> | null): string =>
  error === null ? "The performance report could not be loaded." : describeRpcError(error);

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line. */
const ReportMessage = ({ message }: { readonly message: string }) => (
  <main
    tabIndex={-1}
    data-focus-id="playerCoachReport"
    aria-label="Performance Report"
    className={PAGE_CLASS}
  >
    <h1 className="text-2xl font-bold">Performance Report</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);
