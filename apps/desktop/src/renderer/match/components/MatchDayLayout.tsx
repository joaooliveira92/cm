import { useSyncExternalStore } from "react";
import { type MatchSummary } from "@cm-clone/contracts";
import { Alert } from "../../components/ui/alert.js";
import { Button } from "../../components/ui/button.js";
import { dispatchAction } from "../../actions/dispatch.js";
import { FOCUS_RING } from "../../focus.js";
import { useMatchContext } from "../MatchProvider.js";
import { useCommentaryContext } from "../CommentaryProvider.js";
import { getCommittedMatch, subscribeActiveMatch } from "../session.js";
import { KickoffPanel } from "../KickoffPanel.js";
import { MatchCommentaryStream } from "../MatchCommentaryStream.js";
import { MatchControlPanel } from "../MatchControlPanel.js";
import { MatchOverviewPanel } from "../MatchOverviewPanel.js";
import { PostMatchSummary } from "../PostMatchSummary.js";

export const RESTARTED_FROM_KICKOFF = "The app was closed mid-match, so this match has restarted from kickoff.";

const MatchOngoing = () => {
  return (
    <>
      <MatchCommentaryStream />
      <MatchControlPanel />
    </>
  );
};

const MatchComplete = ({ match }: { readonly match: MatchSummary }) => {
  const { state } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  const committed = state.phase === "committed";
  return (
    <>
      <MatchCommentaryStream />
      {committed && <PostMatchSummary saveId={state.saveId} matchId={match.matchId} />}
      <div className="mt-4 flex items-center gap-3">
        <p className="font-semibold">
          Final score: {match.homeClubName} {comm.homeScore} - {comm.awayScore} {match.awayClubName}
        </p>
        {committed ? (
          <p className="text-text-secondary">Result accepted. Continue to move on.</p>
        ) : (
          <Button
            type="button"
            data-action-id="commit-matchday"
            disabled={state.phase === "committing"}
            onClick={() => void dispatchAction("commit-matchday")}
          >
            {state.phase === "committing" ? "Accepting..." : "Accept result"}
          </Button>
        )}
      </div>
    </>
  );
};

export const MatchDayLayout = () => {
  const { state } = useMatchContext();
  // Once the result is accepted the live session is gone, so a remount of Match day has no match of
  // its own. The committed match is the one the Post-match Summary tab still names; without it a tab
  // click back to Summary would show the kickoff panel instead of the result just accepted.
  const committed = useSyncExternalStore(subscribeActiveMatch, () => getCommittedMatch(state.saveId));
  const committedMatch = state.match === null ? committed?.match ?? null : null;

  return (
    <main
      tabIndex={-1}
      data-focus-id="match"
      aria-label="Match day"
      className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="text-title">Match day</h1>
      {state.error && <Alert variant="destructive" className="mt-2"><p>{state.error}</p></Alert>}

      {!state.match && committedMatch === null && <KickoffPanel />}

      {state.match && state.restoredAfterRestart && state.phase !== "committed" && (
        <Alert role="status" className="mt-2">
          <p>{RESTARTED_FROM_KICKOFF}</p>
        </Alert>
      )}

      {state.match && (
        <section className="stadium-wash mt-6 rounded-panel border border-panel-border-dark p-4 shadow-panel">
          <MatchOverviewPanel saveId={state.saveId} />
          {state.phase === "complete" || state.phase === "committing" || state.phase === "committed" ? (
            <MatchComplete match={state.match} />
          ) : (
            <MatchOngoing />
          )}
        </section>
      )}

      {committedMatch !== null && (
        <section className="stadium-wash mt-6 rounded-panel border border-panel-border-dark p-4 shadow-panel">
          <MatchOverviewPanel saveId={state.saveId} />
          <PostMatchSummary saveId={state.saveId} matchId={committedMatch.matchId} />
        </section>
      )}
    </main>
  );
};