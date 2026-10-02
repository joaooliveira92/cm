import type { CommentaryLineView } from "@cm-clone/contracts";
import { REVEAL_INTERVAL_MS } from "../../rpc.js";
import { shownAtLevel, type HighlightLevel } from "@cm-clone/shared";

/**
 * Whether a line reaches the commentary bar. It must have won its display-chance draw, and its level be within
 * the chosen highlights. A line that doesn't is revealed at once, taking no time, and stays in the
 * log. A line without a level, which the engine sent no playback for, counts as `full`.
 */
export const showsInBar = (line: CommentaryLineView, highlights: HighlightLevel): boolean =>
  line.quiet !== true && shownAtLevel(line.level ?? "full", highlights);

export interface PlaybackPart {
  readonly text: string;
  readonly delayMs: number;
}

/**
 * A line's follow-on parts with their delays scaled by the commentary speed. A line the engine sent no
 * parts for plays as one part on `REVEAL_INTERVAL_MS`, unscaled. That is the pace every line had before
 * lines carried playback, and it keeps such lines' timing exactly as it was.
 */
export const playbackParts = (line: CommentaryLineView, speedFactor: number): ReadonlyArray<PlaybackPart> =>
  line.parts === undefined || line.parts.length === 0
    ? [{ text: line.text, delayMs: REVEAL_INTERVAL_MS }]
    : line.parts.map((part) => ({ text: part.text, delayMs: Math.round(part.delayMs * speedFactor) }));

/** The text the bar shows once `shown` parts of the line have played. Follow-ons continue the line. */
export const textSoFar = (parts: ReadonlyArray<PlaybackPart>, shown: number): string =>
  parts
    .slice(0, shown)
    .map((part) => part.text)
    .join(" ");
