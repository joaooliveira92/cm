import { POSITIONS, type FamiliarityTier, type PlayerAttributes, type Position } from "../positionRules/positions.js";
import type { Line, PositionalRatings } from "./positionalRatings.js";
import { weightedRating } from "./ratings.js";
import { POSITION_SLOT, SLOTS, SLOT_WEIGHTS, legacyPositionOf, sideOf, slotLabel, weightTableOf, widthOf, type Slot } from "../positionRules/slots.js";

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
 * How much of a player's Position Rating in a cell survives his Suitability for it: 1.0 at 20,
 * falling gently to 0.9 at 15, then steeply to 0.5 at 1. The shape is fixed; its points are tuning
 * constants. The match engine's out-of-position cost reads the same curve. See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-phase-strength-scales-with-coverage.md`.
 */
export const suitabilityFactor = (value: number): number =>
  value >= COMPETENT_SUITABILITY
    ? 0.9 + (0.1 * (value - COMPETENT_SUITABILITY)) / (20 - COMPETENT_SUITABILITY)
    : 0.5 + (0.4 * (Math.max(1, value) - 1)) / (COMPETENT_SUITABILITY - 1);

/** A player's Position Rating in a cell, scaled by how well he suits it: what selection reads. */
export const fitRatingAt = (attributes: PlayerAttributes, ratings: PositionalRatings, slot: Slot): number =>
  Math.round(positionRatingAt(attributes, slot) * suitabilityFactor(suitability(ratings, slot)));

/**
 * Transitional: the fit rating at each of the ten Positions' cells, the map Squad Quality and the
 * AI's squad-gap check read. Deleted with the legacy projection.
 */
export const fitRatingsByPosition = (
  attributes: PlayerAttributes,
  ratings: PositionalRatings,
): Record<Position, number> =>
  Object.fromEntries(
    POSITIONS.map((position) => [position, fitRatingAt(attributes, ratings, POSITION_SLOT[position])]),
  ) as Record<Position, number>;

/** The fit rating at every cell of the grid, keyed by `slotLabel` (`GK`, `D RC`): what the Tactic's
 *  selection reads, for the Squad view and the AI's best XI. */
export const fitRatingsByCell = (
  attributes: PlayerAttributes,
  ratings: PositionalRatings,
): Record<string, number> =>
  Object.fromEntries(SLOTS.map((slot) => [slotLabel(slot), fitRatingAt(attributes, ratings, slot)]));

/** Suitability (1-20) at every cell of the grid, keyed by `slotLabel`: what the Tactics screen's fit
 *  indicator and the lineup bar read. */
export const suitabilityByCellOf = (ratings: PositionalRatings): Record<string, number> =>
  Object.fromEntries(SLOTS.map((slot) => [slotLabel(slot), suitability(ratings, slot)]));

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

/**
 * Transitional: the (Position, Familiarity Tier) list the ten-Position model stored, derived from
 * positional ratings so every existing reader keeps working while it moves to Suitability. Each
 * Position takes the best tier among the cells nearest to it (`legacyPositionOf`); Unfamiliar
 * Positions are left out, as the stored rows left them out. Natural Positions come first, then in
 * the Position list's order. Deleted once no reader remains.
 */
export const projectLegacyPositions = (
  ratings: PositionalRatings,
): ReadonlyArray<{ readonly position: Position; readonly familiarity: FamiliarityTier }> => {
  const best = new Map<Position, number>();
  for (const slot of SLOTS) {
    const position = legacyPositionOf(slot);
    best.set(position, Math.max(best.get(position) ?? 0, suitability(ratings, slot)));
  }
  const held = POSITIONS.flatMap((position) => {
    const familiarity = familiarityOf(best.get(position) ?? 0);
    return familiarity === "unfamiliar" ? [] : [{ position, familiarity }];
  });
  return [...held.filter((entry) => entry.familiarity === "natural"), ...held.filter((entry) => entry.familiarity !== "natural")];
};
