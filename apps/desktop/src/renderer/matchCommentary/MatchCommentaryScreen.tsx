import { useCallback, useEffect, useRef, useState } from "react";
import { Effect, Result } from "effect";
import type { CommentaryLineView, SaveId } from "@cm-clone/contracts";
import { leagueTableAtom, resumeSimulation, useAtomValue, POLL_INTERVAL_MS } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { FOCUS_RING } from "../focus.js";

export const MatchCommentaryScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [lines, setLines] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cursorRef = useRef(0);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const pending = tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture : null;
  const matchId = pending?.matchId ?? null;

  const load = useCallback(async () => {
    if (matchId === null) return;
    const outcome = await Effect.runPromise(
      resumeSimulation({ saveId, matchId: matchId as never, cursor: cursorRef.current }).pipe(Effect.result),
    );
    if (Result.isFailure(outcome)) {
      setError(describeRpcError(outcome.failure as RpcClientError<"resumeSimulation">));
      setLoading(false);
      return;
    }
    const view = outcome.success;
    if (view.lines.length > 0) {
      setLines((prev) => [...prev, ...view.lines]);
      cursorRef.current = view.cursor;
    }
    setLoading(false);
  }, [saveId, matchId]);

  useEffect(() => {
    if (matchId === null) return;
    void load();
    const interval = setInterval(() => { void load(); }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, matchId]);

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
      {!loading && !error && lines.length === 0 && (
        <p className="text-text-secondary italic">No commentary available. Start the match first.</p>
      )}
      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line, i) => (
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