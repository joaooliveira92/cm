import { useCallback, useEffect, useRef, useState } from "react";
import { Effect, Result } from "effect";
import type { CommentaryLineView, MatchId, SaveId } from "@cm-clone/contracts";
import { leagueTableAtom, resumeSimulation, useAtomValue, POLL_INTERVAL_MS } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { FOCUS_RING } from "../focus.js";
import { getActiveMatch, getRevealedEvents, reachedFullTime } from "../match/session.js";

/**
 * How many of the match's Commentary Lines this screen may show, or null for all of them. Bound the
 * way Match Statistics is: a live match up to the lines Match day has revealed; the awaiting match in
 * full only if this renderer watched it reach full time; otherwise (e.g. the app restarted mid-match)
 * none. The screen never paces a reveal of its own, so it cannot show a line, a goal or the result
 * before Match day has.
 */
const revealedLimit = (saveId: SaveId, matchId: string): number | null => {
  const session = getActiveMatch(saveId);
  if (session !== null && session.match.matchId === matchId && (session.phase === "live" || session.phase === "paused")) {
    return getRevealedEvents(saveId);
  }
  return reachedFullTime(saveId, matchId as MatchId) ? null : 0;
};

export const MatchCommentaryScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [lines, setLines] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [limit, setLimit] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cursorRef = useRef(0);
  const completeRef = useRef(false);
  const fetchingRef = useRef(false);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const pending = tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture : null;
  const matchId = pending?.matchId ?? null;

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
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="text-2xl font-bold mb-6">Match Commentary</h1>
      {error && <p className="text-destructive mb-4">{error}</p>}
      {loading && !error && <p className="text-text-secondary italic">Loading commentary...</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="text-text-secondary italic">No commentary available. Start the match first.</p>
      )}
      {visible.length > 0 && (
        <div className="space-y-2">
          {visible.map((line, i) => (
            <p key={i} className="text-sm border-b border-panel-border-dark pb-2 last:border-b-0">
              <span className="text-text-tertiary mr-2 font-mono text-xs">{line.minute}'</span>
              <span>{line.text}</span>
            </p>
          ))}
        </div>
      )}
    </main>
  );
};