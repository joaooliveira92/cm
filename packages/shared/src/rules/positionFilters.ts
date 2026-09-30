import type { PositionalRatings } from "./positionalRatings.js";
import { compactPositionLabel } from "./positionLabel.js";
import { COMPETENT_SUITABILITY, suitability } from "./suitability.js";
import { ROWS, type Slot } from "./slots.js";

/**
 * What a position filter can ask: a row, and for outfield rows except the sweeper a side. A player
 * matches when his Suitability for that cell is 15 or more, so a filter finds everyone who can play
 * there, including players whose compact label does not say so (a wing-back fits D R through his WB
 * line). Raw positional ratings never leave the main process; this is what the screens get instead.
 * See `.agents/notes/proposed/feature/2026-09-29-positional-ratings-stay-hidden.md`.
 */
export const POSITION_FILTERS = [
  "GK",
  "SW",
  "D R", "D C", "D L",
  "DM R", "DM C", "DM L",
  "M R", "M C", "M L",
  "AM R", "AM C", "AM L",
  "F R", "F C", "F L",
] as const;
export type PositionFilter = (typeof POSITION_FILTERS)[number];

const ROW_NAMES: Record<string, string> = {
  GK: "Goalkeeper",
  SW: "Sweeper",
  D: "Defender",
  DM: "Defensive Midfielder",
  M: "Midfielder",
  AM: "Attacking Midfielder",
  F: "Forward",
};
const SIDE_NAMES: Record<string, string> = { R: "right", C: "centre", L: "left" };

/** "Defender (right)", "Goalkeeper". */
export const positionFilterName = (filter: PositionFilter): string => {
  const [row, side] = filter.split(" ");
  return side === undefined ? ROW_NAMES[row!]! : `${ROW_NAMES[row!]} (${SIDE_NAMES[side]})`;
};

const cellOf = (filter: PositionFilter): Slot => {
  const [row, side] = filter.split(" ") as [Slot["row"], "R" | "C" | "L" | undefined];
  return { row, column: side ?? "C" } as Slot;
};

/** Every filter the player can play: Suitability 15 or more for its cell. */
export const canPlayOf = (ratings: PositionalRatings): ReadonlyArray<PositionFilter> =>
  POSITION_FILTERS.filter((filter) => suitability(ratings, cellOf(filter)) >= COMPETENT_SUITABILITY);

const SIDE_RANK: Record<string, number> = { R: 0, L: 1, C: 2 };

/**
 * Where a player sorts in a position column: CM's pitch order of his best cell, goalkeeper first and
 * forwards last, then his side in R, L, C order, as the label lists sides. His best cell is the one
 * he suits most; a tie goes to the earlier in pitch order.
 */
export const positionOrderOf = (ratings: PositionalRatings): number => {
  let best: { readonly filter: PositionFilter; readonly fit: number } | null = null;
  for (const filter of POSITION_FILTERS) {
    const fit = suitability(ratings, cellOf(filter));
    if (best === null || fit > best.fit) best = { filter, fit };
  }
  const [row, side] = best!.filter.split(" ");
  return ROWS.indexOf(row as Slot["row"]) * 3 + (side === undefined ? 0 : SIDE_RANK[side]!);
};

/** What a player view carries about positions instead of ratings: the compact label, the filters he
 *  matches, and his sort order. */
export const positionSummaryOf = (ratings: PositionalRatings) => ({
  positionLabel: compactPositionLabel(ratings),
  canPlay: canPlayOf(ratings),
  positionOrder: positionOrderOf(ratings),
});
