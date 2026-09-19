import { useCallback, useEffect, useState } from "react";
import { Effect, Result } from "effect";
import type { MatchStatisticsView, SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { MatchStatsView } from "../match/MatchStatsView.js";
import { getActiveMatch, getRevealedEvents, reachedFullTime } from "../match/session.js";
import { getMatchStatistics, leagueTableAtom, useAtomValue } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";

type StatsState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed"; readonly message: string }
  | { readonly _tag: "ready"; readonly view: MatchStatisticsView | null };

/**
 * Match Statistics (Screens 95 and 100), bound to one match in this order:
 *
 * 1. a live match — cut after the Match Events Match day has revealed, so the totals never run ahead
 *    of the commentary;
 * 2. the started Fixture still awaiting its result — in full only if this renderer watched it reach
 *    full time; otherwise (e.g. the app restarted mid-match) cut at nothing revealed;
 * 3. otherwise the controlled club's most recent played match, resolved by the main process.
 */
export const MatchStatsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [state, setState] = useState<StatsState>({ _tag: "loading" });
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const awaitingMatchId = tableResult._tag === "Success" ? (tableResult.value.season.awaitingFixture?.matchId ?? null) : null;
  // Wait for the season read before binding: loading on a still-pending read would ask for the last
  // played match, and that reply could land after the right one.
  const seasonKnown = tableResult._tag === "Success" || tableResult._tag === "Failure";

  const load = useCallback(async () => {
    const session = getActiveMatch(saveId);
    const live = session !== null && (session.phase === "live" || session.phase === "paused");
    setState({ _tag: "loading" });
    const outcome = await Effect.runPromise(
      getMatchStatistics({
        saveId,
        matchId: live ? session.match.matchId : awaitingMatchId,
        revealedEvents: live
          ? getRevealedEvents(saveId)
          : awaitingMatchId !== null && !reachedFullTime(saveId, awaitingMatchId)
            ? 0
            : null,
      }).pipe(Effect.result),
    );
    setState(
      Result.isFailure(outcome)
        ? { _tag: "failed", message: describeRpcError(outcome.failure as RpcClientError<"getMatchStatistics">) }
        : { _tag: "ready", view: outcome.success },
    );
  }, [saveId, awaitingMatchId]);

  useEffect(() => {
    if (seasonKnown) void load();
  }, [load, seasonKnown]);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchStats"
      aria-label="Match Statistics"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="mb-6 text-2xl font-bold">Match Statistics</h1>
      {state._tag === "loading" && <p className="text-text-secondary italic">Loading statistics...</p>}
      {state._tag === "failed" && (
        <Alert variant="destructive">
          <p>{state.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void load()}>
            Retry
          </Button>
        </Alert>
      )}
      {state._tag === "ready" && state.view === null && (
        <p className="text-text-secondary italic">No match played yet.</p>
      )}
      {state._tag === "ready" && state.view !== null && (
        <>
          <h2 className="mb-3 text-lg font-semibold">
            {state.view.homeClubName} v {state.view.awayClubName}
          </h2>
          <MatchStatsView view={state.view} />
        </>
      )}
    </main>
  );
};
