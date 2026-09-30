import type { FamiliarityTier, PlayerAttributes } from "./positions.js";
import type { Line, PositionalRatings } from "./positionalRatings.js";
import { weightedRating } from "./ratings.js";
import { SLOTS, SLOT_WEIGHTS, sideOf, weightTableOf, widthOf, type Slot } from "./slots.js";

/**
 * The line a slot's row is rated against. D and DM on the flanks read the better of the row's line
 * and Wing Back, because CM put wing-backs in the wide D and DM cells; M reads the better of M and
 * AM − 5, CM 01/02's rule that a natural attacking midfielder is credible in central midfield.
 */
const lineFor = (ratings: PositionalRatings, slot: Slot): number => {
  const line = (code: Line): number => ratings.lines[code];
  const isWide = widthOf(slot.column) === "wide";
  switch (slot.row) {
    case "D":
    case "DM":
      return isWide ? Math.max(line(slot.row), line("WB")) : line(slot.row);
    case "M":
      return Math.max(line("M"), line("AM") - 5);
    default:
      return line(slot.row);
  }
};

/**
 * How well a player suits one cell of the tactics grid, 1-20: the lower of his rating for the
 * slot's line and for its side, so a high line never hides a missing side. The goalkeeper cell reads
 * the GK line alone. This is this game's rule, informed by CM 01/02; CM 03/04's own combining rule is
 * not documented. See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-slot-suitability-min-of-line-and-side.md`.
 */
export const suitability = (ratings: PositionalRatings, slot: Slot): number =>
  slot.row === "GK" ? ratings.lines.GK : Math.min(lineFor(ratings, slot), ratings.sides[sideOf(slot.column)]);

/** Suitability at or above which a player is Natural in a cell. */
export const NATURAL_SUITABILITY = 18;
/** Suitability at or above which a player is Competent in a cell. */
export const COMPETENT_SUITABILITY = 15;

/** The Familiarity Tier a suitability falls in: natural 18-20, competent 15-17, unfamiliar 14 or below. */
export const familiarityOf = (value: number): FamiliarityTier =>
  value >= NATURAL_SUITABILITY ? "natural" : value >= COMPETENT_SUITABILITY ? "competent" : "unfamiliar";

export const familiarityAt = (ratings: PositionalRatings, slot: Slot): FamiliarityTier =>
  familiarityOf(suitability(ratings, slot));

/** A player's 1-100 Position Rating in a cell: his Attributes weighted by the cell's row-and-width table. */
export const positionRatingAt = (attributes: PlayerAttributes, slot: Slot): number =>
  weightedRating(attributes, SLOT_WEIGHTS[weightTableOf(slot)]);

/**
 * Overall Rating over the grid: the best Position Rating among cells where the player is Natural. A
 * player natural nowhere falls back to his most suitable cells, as the Position-based rule fell back
 * to any held Position, so every player has one.
 */
export const overallRatingOverCells = (attributes: PlayerAttributes, ratings: PositionalRatings): number => {
  const scored = SLOTS.map((slot) => ({ slot, fit: suitability(ratings, slot) }));
  const natural = scored.filter((entry) => entry.fit >= NATURAL_SUITABILITY);
  const bestFit = Math.max(...scored.map((entry) => entry.fit));
  const candidates = natural.length > 0 ? natural : scored.filter((entry) => entry.fit === bestFit);
  return Math.max(...candidates.map((entry) => positionRatingAt(attributes, entry.slot)));
};
