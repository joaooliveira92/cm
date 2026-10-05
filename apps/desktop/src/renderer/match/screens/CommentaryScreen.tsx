import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Effect, Result } from "effect";
import { RevealedEvents, type CommentaryLineView, type MatchId, type SaveId } from "@cm-clone/contracts";
import { leagueTableAtom, resumeSimulation, useAtomValue, POLL_INTERVAL_MS } from "../../rpc.js";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";
import { FOCUS_RING } from "../../focus.js";
import { getActiveMatch, getCommittedMatch, getRevealedEvents, revealedToFullTime, subscribeActiveMatch } from "../session.js";
import { CommentaryFeed } from "../CommentaryFeed.js";

/**
 * How many of the match's Commentary Lines this screen may show, or null for all of them. Bound the
 * way Match Statistics is: a live match up to the lines Match day has revealed; the awaiting match in
 * full only while this renderer holds it at full time, and the accepted match in full from the
 * committed store; otherwise (e.g. the app restarted mid-match) none. The screen never paces a reveal
 * of its own, so it cannot show a line, a goal or the result before Match day has. An accepted match
 * is no longer awaited, so the season read never names it here and the committed store stands in.
 */
const revealedLimit = (saveId: SaveId, matchId: string): RevealedEvents | null => {
  const session = getActiveMatch(saveId);
  if (session !== null && session.match.matchId === matchId && (session.phase === "live" || session.phase === "paused")) {
    return getRevealedEvents(saveId);
  }
  if (revealedToFullTime(saveId, matchId as MatchId)) return null;
  const committed = getCommittedMatch(saveId);
  if (committed !== null && committed.match.matchId === matchId) return null;
  return RevealedEvents.make(0);
};

export const MatchCommentaryScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [lines, setLines] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [limit, setLimit] = useState<RevealedEvents | null>(RevealedEvents.make(0));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cursorRef = useRef(0);
  const completeRef = useRef(false);
  const fetchingRef = useRef(false);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  // A season read being refreshed (after Accept result, say) may still name a match no longer
  // awaited, so nothing is bound until it lands.
  const seasonKnown = tableResult._tag === "Success" && !tableResult.waiting;
  const pending = seasonKnown ? tableResult.value.season.awaitingFixture : null;
  // Once the result is accepted the season read stops naming the match, so the committed store is
  // what still names it; without that fallback the tab would read as "No match in play".
  const committed = useSyncExternalStore(subscribeActiveMatch, () => getCommittedMatch(saveId));
  const matchId = pending?.matchId ?? committed?.match.matchId ?? null;
  // With no match started there is nothing to read, so only the season read is awaited.
  const waiting = !seasonKnown || (matchId !== null && loading);

  const load = useCallback(async () => {
    if (matchId === null) return;
    const revealed = revealedLimit(saveId, matchId);
    setLimit(revealed);
    // No read once the lines held reach the revealed position; a chunk can run past it, and the render
    // cuts there.
    const behind = revealed === null ? !completeRef.current : cursorRef.current < revealed;
    if (!behind || fetchingRef.current) {
      setLoading(false);
      return;
    }
    fetchingRef.current = true;
    try {
      const outcome = await Effect.runPromise(
        resumeSimulation({
          saveId,
          matchId: matchId as MatchId,
          cursor: cursorRef.current,
          revealedEvents: revealed,
        }).pipe(Effect.result),
      );
      if (Result.isFailure(outcome)) {
        setError(describeRpcError(outcome.failure as RpcClientError<"resumeSimulation">));
        return;
      }
      const view = outcome.success;
      completeRef.current = view.isComplete;
      cursorRef.current = view.cursor;
      if (view.lines.length > 0) setLines((prev) => [...prev, ...view.lines]);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [saveId, matchId]);

  useEffect(() => {
    if (matchId === null) return;
    // `load` synchronously records the reveal cut and clears `loading` when there is nothing behind
    // the cut yet — without the second, a match with no revealed lines would show "Loading
    // commentary" forever. Its cursor lives in refs the poll owns, so the set cannot be lifted to a
    // derived value without changing when the cut and the label move; suppressed as intrinsic.
    // eslint-disable-next-line react/set-state-in-effect -- poll records the reveal cut synchronously
    void load();
    const interval = setInterval(() => { void load(); }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, matchId]);

  const visible = limit === null ? lines : lines.slice(0, limit);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchCommentary"
      aria-label="Match Commentary"
      className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="text-title mb-6">Match Commentary</h1>
      {error && <p className="text-destructive mb-4">{error}</p>}
      {waiting && !error && <p className="text-text-secondary italic">Loading commentary...</p>}
      {/* Empty for one of two reasons: no match has started, or Match day has revealed none of it
          in this renderer (it has only just kicked off, or the app restarted mid-match). */}
      {!waiting && !error && visible.length === 0 && (
        <p className="text-text-secondary italic">
          {matchId === null
            ? "No match in play. Commentary appears here once one kicks off on Match day."
            : "No Commentary Lines revealed yet. They appear here as Match day reveals them."}
        </p>
      )}
      {visible.length > 0 && <CommentaryFeed lines={visible} emptyMessage="" className="max-h-[75vh]" />}
    </main>
  );
};