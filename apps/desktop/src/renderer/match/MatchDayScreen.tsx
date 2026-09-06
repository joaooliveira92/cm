import { type MatchSummary, type SaveId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { dispatchAction } from "../actions/dispatch.js";
import { MatchProvider, useMatchContext } from "./MatchProvider.js";
import { KickoffPanel } from "./KickoffPanel.js";
import { MatchCommentaryStream } from "./MatchCommentaryStream.js";
import { MatchControlPanel } from "./MatchControlPanel.js";

/**
 * Match day (Phases 1–4): the screen is a thin composition over the MatchProvider context. All
 * match lifecycle, streaming and control state lives in the provider; the kickoff panel, the
 * commentary stream and the live control panel are compound consumers, and the `isComplete`
 * boolean is lifted into one explicit variant choice (`MatchOngoing`/`MatchComplete`, Phase 3)
 * instead of scattered conditionals.
 */

/** The live-match variant (Phase 3): the commentary stream plus the live control panel. */
const MatchOngoing = () => (
  <>
    <MatchCommentaryStream />
    <MatchControlPanel />
  </>
);

/**
 * The full-time variant (Phase 3): the settled feed stays on screen — scoreboard, status and
 * revealed lines — with the final score and the commit below it.
 *
 * Full time and the career accepting the result are two different things, so the button is real
 * work rather than navigation: until it is pressed the Matchday has not been committed, the rest of
 * the division has not played, and the Calendar has not moved.
 */
const MatchComplete = ({ match }: { readonly match: MatchSummary }) => {
  const { state } = useMatchContext();
  const committed = state.phase === "committed";
  return (
    <>
      <MatchCommentaryStream />
      <div className="mt-4 flex items-center gap-3">
        <p className="font-semibold">
          Final score: {match.homeClubName} {state.homeScore} - {state.awayScore} {match.awayClubName}
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
    <MatchDayLayout />
  </MatchProvider>
);

const MatchDayLayout = () => {
  const { state } = useMatchContext();
  return (
    <main className="bg-background p-8 text-foreground">
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