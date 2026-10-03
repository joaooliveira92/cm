import { useEffect, useState, useSyncExternalStore } from "react";
import type { MatchStatisticsView, SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { describeRpcError } from "../rpc/errors.js";
import { getMatchStatistics } from "../rpc.js";
import { getActiveMatch, getRevealedEvents, subscribeActiveMatch, type ActiveMatchSession } from "./session.js";
import type { BoundMatchState } from "./useBoundMatchRead.js";

/**
 * The persistent Attacks bar (map ticket 14): under every live and post-match tab, each side's share
 * of the attacks with both percentages printed and the split drawn in the two clubs' colours. Before
 * the first attack it is a neutral track reading "No attacks yet", never a 50-50. It follows the
 * match session, so it runs from kickoff until the result is accepted and is absent pre-match.
 *
 * The share is the statistics read's `homeAttackShare`/`awayAttackShare`, cut at the revealed
 * position live, so the bar never shows an attack the manager has not seen. It is a derivation, not
 * possession, and is never labelled as such (Agent Note: the possession bar shows attack share).
 */
export const AttacksBar = ({ saveId }: { readonly saveId: SaveId }) => {
  const session = useSyncExternalStore(subscribeActiveMatch, () => getActiveMatch(saveId));
  if (session === null) return null;
  return <AttacksBarContent saveId={saveId} session={session} />;
};

/**
 * The attack share for the session's match, re-read as Match day reveals each event, so the live bar
 * moves with the commentary. A read that is still in flight when the next event is revealed is
 * discarded rather than allowed to land out of order.
 *
 * Deliberately not `useBoundMatchRead`: that hook reads once per binding and resets to `loading` on
 * every read, which would flicker the bar back to neutral on each reveal. This keeps the previous
 * share on screen while the next read is in flight, and re-reads on the revealed count.
 */
const useAttackShare = (saveId: SaveId, session: ActiveMatchSession): BoundMatchState<MatchStatisticsView> => {
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

const AttacksBarContent = ({
  saveId,
  session,
}: {
  readonly saveId: SaveId;
  readonly session: ActiveMatchSession;
}) => {
  const state = useAttackShare(saveId, session);
  const view = state._tag === "ready" ? state.view : null;
  const homeShare = view?.homeAttackShare ?? null;
  const awayShare = view?.awayAttackShare ?? null;
  const hasShare = homeShare !== null && awayShare !== null;
  // Only a read that has landed may say "No attacks yet": while loading or after a failure the bar
  // shows the neutral track with no claim, so it never reports an empty match it has not seen.
  const noAttacksYet = state._tag === "ready" && !hasShare;
  const { homeClubName, awayClubName, homeClubColours, awayClubColours } = session.match;

  return (
    <section
      aria-label="Attacks"
      className="flex h-8 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-raised px-3 text-data text-text-secondary"
    >
      <span className="font-medium">Attacks</span>
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
          {noAttacksYet && <span className="text-text-muted">No attacks yet</span>}
        </>
      )}
    </section>
  );
};
