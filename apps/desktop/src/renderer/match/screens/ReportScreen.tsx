import { useCallback, useEffect, useState } from "react";
import { Effect, Result } from "effect";
import type { ClubId, MatchId, MatchReportEventView, MatchReportView, SaveId } from "@cm-clone/contracts";
import { Alert } from "../../components/ui/alert.js";
import { Button } from "../../components/ui/button.js";
import { FOCUS_RING } from "../../focus.js";
import { formatMinute } from "../../format.js";
import { MatchStatsView } from "../MatchStatsView.js";
import { getLatestMatchReport, getMatchReport } from "../../rpc.js";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";

type ReportState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "notComplete" }
  | { readonly _tag: "empty" }
  | { readonly _tag: "failed"; readonly message: string }
  | { readonly _tag: "ready"; readonly report: MatchReportView };

/** A report state that carries a settled answer — everything but `loading`. */
type SettledReport = Exclude<ReportState, { readonly _tag: "loading" }>;

/** Words, never colour alone, for each event kind (Screen 103 §12). */
const EVENT_LABEL: Readonly<Record<MatchReportEventView["kind"], string>> = {
  Goal: "Goal",
  YellowCard: "Yellow card",
  RedCard: "Red card",
  Injury: "Injury",
  Substitution: "Substitution",
  GoalkeeperStandIn: "Goalkeeper stand-in",
};

/** The result as one complete sentence, never assembled from fragments (Screen 103 §13). */
const resultSentence = (report: MatchReportView): string =>
  report.homeScore > report.awayScore
    ? `${report.homeClubName} beat ${report.awayClubName} ${report.homeScore}-${report.awayScore}.`
    : report.homeScore < report.awayScore
      ? `${report.awayClubName} won ${report.awayScore}-${report.homeScore} away at ${report.homeClubName}.`
      : `${report.homeClubName} and ${report.awayClubName} drew ${report.homeScore}-${report.awayScore}.`;

/** A goalkeeper stand-in was already on the pitch, so it reads as a move into goal. The keeper it
 *  replaces may have been brought off rather than injured, so only `forcedByInjury` says "injured". */
const eventText = (event: MatchReportEventView, clubName: string): string => {
  const label = EVENT_LABEL[event.kind];
  if (event.replaced === null) return `${label}: ${event.playerName} (${clubName})`;
  const replaced = event.replaced.forcedByInjury ? `the injured ${event.replaced.playerName}` : event.replaced.playerName;
  return event.kind === "GoalkeeperStandIn"
    ? `${label}: ${event.playerName} moves into goal for ${replaced} (${clubName})`
    : `${label}: ${event.playerName} on for ${replaced} (${clubName})`;
};

/**
 * The Match Report (Screen 103) for one committed match: the result and half-time score, each side's
 * goalscorers, every goal, card, injury and substitution in match order, and the full-match team
 * statistics. Everything is read from `getMatchReport`; the screen composes sentences and computes
 * nothing about the match.
 *
 * `matchId` is a named match when the report was reached from a link that carries one. The post-match
 * Report tab carries none — the match session is gone once the result is committed — so the screen
 * omits it and the save-scoped `getLatestMatchReport` resolves the match just played.
 */
export const MatchReportScreen = ({
  saveId,
  matchId,
}: {
  readonly saveId: SaveId;
  readonly matchId?: MatchId | null;
}) => {
  const [attempt, setAttempt] = useState(0);
  // The report read is keyed by save, match (or "latest") and an attempt counter. A result tagged
  // with the current key is shown; any other render is `loading`, derived rather than set. The
  // counter keeps a Retry showing `loading` until its fresh answer lands.
  const key = `${saveId}:${matchId ?? "latest"}:${attempt}`;
  const [stored, setStored] = useState<{ readonly key: string; readonly state: SettledReport } | null>(
    null,
  );

  const readReport = useCallback(async (): Promise<SettledReport> => {
    const named = matchId !== undefined && matchId !== null;
    const read: Effect.Effect<
      MatchReportView | null,
      RpcClientError<"getMatchReport"> | RpcClientError<"getLatestMatchReport">
    > = named ? getMatchReport({ saveId, matchId }) : getLatestMatchReport({ saveId });
    const outcome = await Effect.runPromise(read.pipe(Effect.result));
    if (Result.isSuccess(outcome)) {
      return outcome.success === null
        ? { _tag: "empty" }
        : { _tag: "ready", report: outcome.success };
    }
    const failure = outcome.failure;
    return failure._tag === "RemoteFailure" && failure.error._tag === "MatchNotCompleteError"
      ? { _tag: "notComplete" }
      : { _tag: "failed", message: describeRpcError(failure) };
  }, [saveId, matchId]);

  const applyReport = useCallback(
    (next: SettledReport): void => {
      setStored({ key, state: next });
    },
    [key],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      const next = await readReport();
      if (!cancelled) applyReport(next);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [readReport, applyReport]);

  const state: ReportState = stored !== null && stored.key === key ? stored.state : { _tag: "loading" };
  const retry = (): void => setAttempt((n) => n + 1);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchReport"
      aria-label="Match Report"
      className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="mb-6 text-title">Match Report</h1>
      {state._tag === "loading" && <p className="text-text-secondary italic">Loading the match report...</p>}
      {state._tag === "notComplete" && (
        <p className="text-text-secondary">The match report is available once the result has been accepted.</p>
      )}
      {state._tag === "empty" && (
        <p className="text-text-secondary">No match report is available yet.</p>
      )}
      {state._tag === "failed" && (
        <Alert variant="destructive">
          <p>{state.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={retry}>
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
    <div className="space-y-6 text-body">
      <section aria-label="Result" className="space-y-1">
        <h2 className="text-heading">
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
              <h2 className="text-heading text-text-soft">{label}</h2>
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
        <h2 className="text-heading text-text-soft">Timeline</h2>
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
        <h2 className="mb-2 text-heading text-text-soft">Statistics</h2>
        <MatchStatsView view={report.statistics} />
      </section>
    </div>
  );
};
