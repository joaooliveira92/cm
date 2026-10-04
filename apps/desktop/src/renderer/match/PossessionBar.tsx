import { useEffect, useState, useSyncExternalStore } from "react";
import type { MatchStatisticsView, SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { describeRpcError } from "../rpc/errors.js";
import { getMatchStatistics } from "../rpc.js";
import { getActiveMatch, getRevealedEvents, subscribeActiveMatch, type ActiveMatchSession } from "./session.js";
import type { BoundMatchState } from "./useBoundMatchRead.js";

/**
 * The persistent Possession bar: under every live tab (and every post-match tab, once that context
 * is reachable — match-screen ticket 21), each side's share of the minutes with the ball, both
 * percentages printed and the split drawn in the two clubs' colours. Before any possession tally it
 * is a neutral track reading "Not tracked", never a 50-50. It follows the match session, so it runs
 * from kickoff until the result is accepted and is absent pre-match.
 *
 * The share is the statistics read's `possession` row, cut at the revealed position live, so the bar
 * never shows a slice the manager has not seen. Attacks stays a row on the Statistics tab. See
 * `.agents/notes/implemented/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md`.
 */
export const PossessionBar = ({ saveId }: { readonly saveId: SaveId }) => {
  const session = useSyncExternalStore(subscribeActiveMatch, () => getActiveMatch(saveId));
  if (session === null) return null;
  return <PossessionBarContent saveId={saveId} session={session} />;
};

/**
 * The possession share for the session's match, re-read as Match day reveals each event, so the live
 * bar moves with the commentary. A read that is still in flight when the next event is revealed is
 * discarded rather than allowed to land out of order.
 *
 * Deliberately not `useBoundMatchRead`: that hook reads once per binding and resets to `loading` on
 * every read, which would flicker the bar back to neutral on each reveal. This keeps the previous
 * share on screen while the next read is in flight, and re-reads on the revealed count.
 */
const usePossession = (saveId: SaveId, session: ActiveMatchSession): BoundMatchState<MatchStatisticsView> => {
  const live = session.phase === "live" || session.phase === "paused";
  const revealedEvents = useSyncExternalStore(subscribeActiveMatch, () => getRevealedEvents(saveId));
  const [state, setState] = useState<BoundMatchState<MatchStatisticsView>>({ _tag: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const outcome = await Effect.runPromise(
        getMatchStatistics({
          saveId,
          matchId: session.match.matchId,
          revealedEvents: live ? revealedEvents : null,
        }).pipe(Effect.result),
      );
      if (cancelled) return;
      setState(
        Result.isFailure(outcome)
          ? { _tag: "failed", message: describeRpcError(outcome.failure) }
          : { _tag: "ready", view: outcome.success },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [saveId, session.match.matchId, live, revealedEvents]);

  return state;
};

const PossessionBarContent = ({
  saveId,
  session,
}: {
  readonly saveId: SaveId;
  readonly session: ActiveMatchSession;
}) => {
  const state = usePossession(saveId, session);
  const view = state._tag === "ready" ? state.view : null;
  const possession = view?.rows.find((row) => row.key === "possession") ?? null;
  const homeShare = possession?.home ?? null;
  const awayShare = possession?.away ?? null;
  const hasShare = homeShare !== null && awayShare !== null;
  // Only a read that has landed may say "Not tracked": while loading or after a failure the bar
  // shows the neutral track with no claim, so it never reports an untracked match it has not seen.
  const notTracked = state._tag === "ready" && !hasShare;
  const { homeClubName, awayClubName, homeClubColours, awayClubColours } = session.match;

  return (
    <section
      aria-label="Possession"
      className="flex h-8 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-raised px-3 text-data text-text-secondary"
    >
      <span className="font-medium">Possession</span>
      {hasShare ? (
        <>
          <span className="tabular-nums text-text-primary" aria-label={`${homeClubName} ${homeShare} percent`}>
            {homeShare}%
          </span>
          <div aria-hidden="true" className="flex h-2 flex-1 overflow-hidden rounded-full bg-border-subtle">
            <div style={{ width: `${homeShare}%`, backgroundColor: homeClubColours.primary.background }} />
            <div style={{ width: `${awayShare}%`, backgroundColor: awayClubColours.primary.background }} />
          </div>
          <span className="tabular-nums text-text-primary" aria-label={`${awayClubName} ${awayShare} percent`}>
            {awayShare}%
          </span>
        </>
      ) : (
        <>
          <div aria-hidden="true" className="h-2 flex-1 rounded-full bg-border-subtle" />
          {notTracked && <span className="text-text-muted">Not tracked</span>}
        </>
      )}
    </section>
  );
};
