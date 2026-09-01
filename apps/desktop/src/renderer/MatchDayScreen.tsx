import { type MatchSummary, type SaveId } from "@cm-clone/contracts";
import { Button } from "./components/ui/button.js";
import { dispatchAction } from "./actions/dispatch.js";
import { MatchProvider, useMatchContext } from "./match/MatchProvider.js";
import { OpponentPicker } from "./match/OpponentPicker.js";
import { MatchCommentaryStream } from "./match/MatchCommentaryStream.js";
import { MatchControlPanel } from "./match/MatchControlPanel.js";

/**
 * Match day (Phases 1–4): the screen is a thin composition over the MatchProvider context. All
 * match lifecycle, streaming and control state lives in the provider; the opponent picker, the
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

/** The full-time variant (Phase 3): the settled feed stays on screen — scoreboard, status and
 *  revealed lines — with the final score and reset below it. */
const MatchComplete = ({ match }: { readonly match: MatchSummary }) => {
  const { state } = useMatchContext();
  return (
    <>
      <MatchCommentaryStream />
      <div className="mt-4 flex items-center gap-3">
        <p className="font-semibold">
          Final score: {match.homeClubName} {state.homeScore} - {state.awayScore} {match.awayClubName}
        </p>
        <Button
          type="button"
          variant="secondary"
          data-action-id="reset-match"
          onClick={() => void dispatchAction("reset-match")}
        >
          Back to opponent picker
        </Button>
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

      {!state.match && <OpponentPicker />}

      {state.match && (
        <section className="stadium-wash mt-6 rounded-panel border border-panel-border-dark p-4 shadow-panel">
          {state.isComplete ? (
            <MatchComplete match={state.match} />
          ) : (
            <MatchOngoing />
          )}
        </section>
      )}
    </main>
  );
};