import { type MatchSummary, type SaveId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { dispatchAction } from "../actions/dispatch.js";
import { FOCUS_RING } from "../focus.js";
import { MatchProvider, useMatchContext } from "./MatchProvider.js";
import { CommentaryProvider, useCommentaryContext } from "./CommentaryProvider.js";
import { KickoffPanel } from "./KickoffPanel.js";
import { MatchCommentaryStream } from "./MatchCommentaryStream.js";
import { MatchControlPanel } from "./MatchControlPanel.js";

const MatchOngoing = () => (
  <>
    <MatchCommentaryStream />
    <MatchControlPanel />
  </>
);

const MatchComplete = ({ match }: { readonly match: MatchSummary }) => {
  const { state } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  const committed = state.phase === "committed";
  return (
    <>
      <MatchCommentaryStream />
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

export const MatchDayScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <MatchProvider saveId={saveId}>
    <CommentaryProvider>
      <MatchDayLayout />
    </CommentaryProvider>
  </MatchProvider>
);

const MatchDayLayout = () => {
  const { state } = useMatchContext();
  return (
    <main
      tabIndex={-1}
      data-focus-id="match"
      aria-label="Match day"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="text-2xl font-bold">Match day</h1>
      {state.error && <p className="mt-2 text-destructive">{state.error}</p>}

      {!state.match && <KickoffPanel />}

      {state.match && (
        <section className="stadium-wash mt-6 rounded-panel border border-panel-border-dark p-4 shadow-panel">
          {state.phase === "complete" || state.phase === "committing" || state.phase === "committed" ? (
            <MatchComplete match={state.match} />
          ) : (
            <MatchOngoing />
          )}
        </section>
      )}
    </main>
  );
};