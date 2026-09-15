import { useCallback, useEffect, useState } from "react";
import { Effect, Result } from "effect";
import type { ClubId, MatchId, MatchReportEventView, MatchReportView, SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { formatMinute } from "../format.js";
import { MatchStatsView } from "../match/MatchStatsView.js";
import { getMatchReport } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";

type ReportState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "notComplete" }
  | { readonly _tag: "failed"; readonly message: string }
  | { readonly _tag: "ready"; readonly report: MatchReportView };

/** Words, never colour alone, for each event kind (Screen 103 §12). */
const EVENT_LABEL: Readonly<Record<MatchReportEventView["kind"], string>> = {
  Goal: "Goal",
  YellowCard: "Yellow card",
  RedCard: "Red card",
  Injury: "Injury",
  Substitution: "Substitution",
};

/** The result as one complete sentence, never assembled from fragments (Screen 103 §13). */
const resultSentence = (report: MatchReportView): string =>
  report.homeScore > report.awayScore
    ? `${report.homeClubName} beat ${report.awayClubName} ${report.homeScore}-${report.awayScore}.`
    : report.homeScore < report.awayScore
      ? `${report.awayClubName} won ${report.awayScore}-${report.homeScore} away at ${report.homeClubName}.`
      : `${report.homeClubName} and ${report.awayClubName} drew ${report.homeScore}-${report.awayScore}.`;

const eventText = (event: MatchReportEventView, clubName: string): string =>
  event.replaced === null
    ? `${EVENT_LABEL[event.kind]}: ${event.playerName} (${clubName})`
    : event.replaced.forcedByInjury
      ? `${EVENT_LABEL[event.kind]}: ${event.playerName} on for the injured ${event.replaced.playerName} (${clubName})`
      : `${EVENT_LABEL[event.kind]}: ${event.playerName} on for ${event.replaced.playerName} (${clubName})`;

/**
 * The Match Report (Screen 103) for one committed match: the result and half-time score, each side's
 * goalscorers, every goal, card, injury and substitution in match order, and the full-match team
 * statistics. Everything is read from `getMatchReport`; the screen composes sentences and computes
 * nothing about the match.
 */
export const MatchReportScreen = ({ saveId, matchId }: { readonly saveId: SaveId; readonly matchId: MatchId }) => {
  const [state, setState] = useState<ReportState>({ _tag: "loading" });

  const load = useCallback(async () => {
    setState({ _tag: "loading" });
    const outcome = await Effect.runPromise(getMatchReport({ saveId, matchId }).pipe(Effect.result));
    if (Result.isSuccess(outcome)) {
      setState({ _tag: "ready", report: outcome.success });
      return;
    }
    const failure = outcome.failure as RpcClientError<"getMatchReport">;
    setState(
      failure._tag === "RemoteFailure" && failure.error._tag === "MatchNotCompleteError"
        ? { _tag: "notComplete" }
        : { _tag: "failed", message: describeRpcError(failure) },
    );
  }, [saveId, matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchReport"
      aria-label="Match Report"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="mb-6 text-2xl font-bold">Match Report</h1>
      {state._tag === "loading" && <p className="text-text-secondary italic">Loading the match report...</p>}
      {state._tag === "notComplete" && (
        <p className="text-text-secondary">The match report is available once the result has been accepted.</p>
      )}
      {state._tag === "failed" && (
        <Alert variant="destructive">
          <p>{state.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void load()}>
            Retry
          </Button>
        </Alert>
      )}
      {state._tag === "ready" && <Report report={state.report} />}
    </main>
  );
};

const Report = ({ report }: { readonly report: MatchReportView }) => {
  const clubName = (clubId: ClubId) => (clubId === report.homeClubId ? report.homeClubName : report.awayClubName);
  const goals = report.events.filter((event) => event.kind === "Goal");

  return (
    <div className="space-y-6 text-sm">
      <section aria-label="Result" className="space-y-1">
        <h2 className="text-lg font-semibold">
          {report.homeClubName} {report.homeScore} - {report.awayScore} {report.awayClubName}
        </h2>
        <p>{resultSentence(report)}</p>
        <p className="text-text-secondary">
          Half time: {report.homeClubName} {report.halfTimeHomeScore} - {report.halfTimeAwayScore} {report.awayClubName}
        </p>
      </section>

      <div className="grid max-w-xl grid-cols-2 gap-4">
        {[report.homeClubId, report.awayClubId].map((clubId) => {
          const label = `${clubName(clubId)} goalscorers`;
          const own = goals.filter((goal) => goal.clubId === clubId);
          return (
            <section key={clubId}>
              <h2 className="text-xs font-semibold text-text-body">{label}</h2>
              {own.length === 0 ? (
                <p className="mt-1 text-text-muted">None</p>
              ) : (
                <ul aria-label={label} className="mt-1 space-y-1">
                  {own.map((goal, index) => (
                    <li key={`${goal.playerId}-${index}`}>
                      {goal.playerName} <span className="tabular-nums text-text-muted">{formatMinute(goal.minute, goal.half)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section>
        <h2 className="text-xs font-semibold text-text-body">Timeline</h2>
        {report.events.length === 0 ? (
          <p className="mt-1 text-text-muted">No goals, cards, injuries or substitutions.</p>
        ) : (
          <ol aria-label="Match timeline" className="mt-1 space-y-1">
            {report.events.map((event, index) => (
              <li key={`${event.kind}-${event.playerId}-${index}`}>
                <span className="mr-2 tabular-nums text-text-muted">{formatMinute(event.minute, event.half)}</span>
                {eventText(event, clubName(event.clubId))}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold text-text-body">Statistics</h2>
        <MatchStatsView view={report.statistics} />
      </section>
    </div>
  );
};
