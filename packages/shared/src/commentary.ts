/**
 * Commentary highlight levels, after Championship Manager's event priority, from the most important
 * moments to all of them. A commentary file section sets one; a player watching at a level sees in the
 * commentary bar only lines at that level or a more important one. The one definition the engine's
 * parser, the wire contract and the renderer's preference all derive from.
 */
export const HIGHLIGHT_LEVELS = ["key", "extended", "full"] as const;

export type HighlightLevel = (typeof HIGHLIGHT_LEVELS)[number];

export const isHighlightLevel = (value: string): value is HighlightLevel =>
  (HIGHLIGHT_LEVELS as ReadonlyArray<string>).includes(value);

/** Whether a line at `line` shows to a player watching at `watching`. */
export const shownAtLevel = (line: HighlightLevel, watching: HighlightLevel): boolean =>
  HIGHLIGHT_LEVELS.indexOf(line) <= HIGHLIGHT_LEVELS.indexOf(watching);
