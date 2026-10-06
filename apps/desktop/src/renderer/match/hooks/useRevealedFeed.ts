import { useCallback, useMemo, useRef, useState } from "react";
import type { CommentaryLineView, MatchId, SaveId } from "@cm-clone/contracts";
import { recordHalfTimeRevealed, recordRevealedLines, recordRevealedMinute } from "../session.js";

export interface RevealedFeedState {
  /** What the manager has been shown, oldest first. Append-only: a line leaves the buffer once and
   *  only once, and nothing already shown is ever rewritten (ADR-0007). */
  readonly lines: ReadonlyArray<CommentaryLineView>;
  readonly minute: number;
}

export interface RevealedFeed {
  readonly state: RevealedFeedState;
  /** The minute the reveal stands at, read at call time — a command stamps itself from this. */
  readonly minute: () => number;
  /** `line` has finished playing and is now part of the revealed play, so it is recorded: the lines,
   *  the minute, and whether the walkout at half time has passed. */
  readonly reveal: (line: CommentaryLineView) => void;
}

/**
 * The revealed play: what has been shown, and the session records that survive a remount.
 *
 * Recording is not a side concern bolted onto state — the session store *is* the feed's memory across
 * navigating away, so the same operation that moves the reveal writes it down.
 */
export const useRevealedFeed = ({
  saveId,
  matchId,
  restoredLines,
  restoredMinute,
}: {
  readonly saveId: SaveId;
  readonly matchId: MatchId | undefined;
  readonly restoredLines: ReadonlyArray<CommentaryLineView>;
  readonly restoredMinute: number;
}): RevealedFeed => {
  const [lines, setLines] = useState(restoredLines);
  const [minute, setMinute] = useState(restoredMinute);
  // Kept beside the state so a reveal never has to read a closure's copy of the lines, and so the
  // append is not performed inside a state updater — updaters must stay pure.
  const linesRef = useRef(restoredLines);
  const minuteRef = useRef(restoredMinute);

  const reveal = useCallback(
    (line: CommentaryLineView): void => {
      const next = [...linesRef.current, line];
      linesRef.current = next;
      minuteRef.current = line.minute;
      setLines(next);
      setMinute(line.minute);
      if (matchId === undefined) return;
      recordRevealedLines(saveId, matchId, next);
      recordRevealedMinute(saveId, matchId, line.minute);
      if (line.tag === "HalfTimeReached") recordHalfTimeRevealed(saveId, matchId);
    },
    [saveId, matchId],
  );

  return useMemo(
    (): RevealedFeed => ({ state: { lines, minute }, minute: () => minuteRef.current, reveal }),
    [lines, minute, reveal],
  );
};
