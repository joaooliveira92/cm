import { useEffect, useRef } from "react";
import { Effect, Result } from "effect";
import { changesClubView } from "@cm-clone/game-engine";
import type { CommentaryLineView, MatchSummary, SaveId } from "@cm-clone/contracts";
import { resumeSimulation } from "../../rpc.js";
import { getRevealedEvents } from "../session.js";
import type { MatchStream, ReadProjection } from "../stream.js";

/**
 * Re-reads the controlled club's view when a revealed line changes it.
 *
 * The reveal itself is driven by the stream; this owner watches the settled revealed lines and, when
 * the newest one is state-changing, asks for a read from the position now revealed. It holds no state
 * of its own beyond the one-shot restore read, and acts only through the `stream` and `read` ports.
 *
 * Which tags change the club's view is a match rule, not a view detail: it lives beside the event
 * vocabulary as `changesClubView`, so a new event reaches this re-read through that one home.
 *
 * A match left paused on a decision needs its counts back before the panel can offer them, so the
 * first pass reads even though nothing has been revealed yet.
 */
export const useStateChangeReread = ({
  saveId,
  match,
  lines,
  initialRead,
  stream,
  read,
}: {
  readonly saveId: SaveId;
  readonly match: MatchSummary | null;
  /** What the manager has been shown, oldest first. The newest line's tag is the trigger. */
  readonly lines: ReadonlyArray<CommentaryLineView>;
  /** Read once on mount even before a reveal, to restore the counts a paused decision needs. */
  readonly initialRead: boolean;
  readonly stream: MatchStream;
  readonly read: ReadProjection;
}): void => {
  const lastRevealedTag = lines.at(-1)?.tag;
  const restoreReadRef = useRef(initialRead);
  useEffect(() => {
    if (match === null) return;
    const restoring = restoreReadRef.current;
    restoreReadRef.current = false;
    if (!restoring && (lines.length === 0 || lastRevealedTag === undefined || !changesClubView(lastRevealedTag))) return;
    const revealedEvents = getRevealedEvents(saveId);
    const stamp = stream.stamp();
    const resume = resumeSimulation({ saveId, matchId: match.matchId, cursor: stream.cursor(), revealedEvents });
    // The projection only: the lines this read returns are not buffered, because the poller reads on
    // from the revealed position anyway and would return them a second time.
    Effect.runPromise(resume.pipe(Effect.result)).then(
      (outcome) => {
        if (Result.isFailure(outcome)) return;
        read.polled(outcome.success, stamp);
      },
      () => undefined,
    );
  }, [lines.length, lastRevealedTag, match, saveId, stream, read]);
};
