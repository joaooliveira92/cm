/**
 * Test fixtures: the position fields a player view carries (CM label, can-play filters, sort order)
 * for a player described by one of the ten legacy Positions, derived from real ratings so fixtures
 * read the same way production does.
 */
import {
  POSITION_SLOT,
  familiarityOf,
  positionSummaryOf,
  type FamiliarityTier,
  type PositionalRatings,
  type Position,
} from "@cm-clone/shared";

const LEVEL: Record<FamiliarityTier, number> = { natural: 19, competent: 16, unfamiliar: 10 };

/** Ratings that make a player `familiarity` at the legacy Position's cell and nothing else. */
const ratingsFor = (position: string, familiarity: FamiliarityTier = "natural"): PositionalRatings => {
  const slot = POSITION_SLOT[position as Position] ?? POSITION_SLOT.MC;
  const level = LEVEL[familiarity];
  const lines = { GK: 1, SW: 1, D: 1, DM: 1, M: 1, AM: 1, F: 1, WB: 1, [slot.row]: level };
  const side = slot.column === "L" ? "L" : slot.column === "R" ? "R" : "C";
  return { lines, sides: { R: 1, L: 1, C: 1, [side]: level }, freeRole: 1 } as PositionalRatings;
};

export const positionSummaryFor = (position: string, familiarity: FamiliarityTier = "natural") =>
  positionSummaryOf(ratingsFor(position, familiarity));

/** A squad row's Suitability map: `familiarity` at the given Position, unfamiliar elsewhere. */
export const suitabilityFor = (position: string, familiarity: string = "natural"): Record<string, number> => {
  const level = LEVEL[familiarityOf(LEVEL[familiarity as FamiliarityTier] ?? 19)];
  return { [position]: level };
};
