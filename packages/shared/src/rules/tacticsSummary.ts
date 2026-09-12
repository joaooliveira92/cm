import type { FamiliarityTier } from "./positions.js";

/**
 * The selection summary's numbers, derived from the registered squad and the active Tactic's slots
 * and bench.
 *
 * Both derivations live here in `shared` so the overview's snapshot read and any renderer that
 * shows it compute the same partition and the same counts from the same inputs — one home per
 * meaning, per the packages rule. Each is pure and takes facts, never a database.
 */

/** A registered squad relied on by the active Tactic's match-day selection. */
export interface SelectionPartition {
  /** The registered players named in the active Tactic's slots, in slot order. A slot whose player
   *  has since left the squad contributes to neither list — that gap is a readiness blocker, not a
   *  starter or a substitute. */
  readonly starters: ReadonlyArray<string>;
  /** The registered players named on the active Tactic's bench, in bench order. A bench slot that is
   *  empty (`null`) contributes nothing, and a named player is never double-counted against an
   *  overlapping starter slot. */
  readonly substitutes: ReadonlyArray<string>;
}

/**
 * Splits a squad into the players a Tactic starts (the players its slots name, restricted to those
 * still registered, in slot order) and the players it benches (the players named on its bench,
 * restricted to those still registered and not already started). Starters and substitutes never
 * overlap; together they are the match-day eighteen, a subset of the squad. Squad members outside
 * the eighteen are part of no selection and appear in neither list.
 */
export const partitionSelection = (
  squadPlayerIds: ReadonlyArray<string>,
  slotPlayerIds: ReadonlyArray<string>,
  benchPlayerIds: ReadonlyArray<string>,
): SelectionPartition => {
  const squadSet = new Set(squadPlayerIds);
  const slotSet = new Set(slotPlayerIds);
  const starters = slotPlayerIds.filter((id) => squadSet.has(id));
  const substitutes = benchPlayerIds.filter((id) => squadSet.has(id) && !slotSet.has(id));
  return { starters, substitutes };
};

/** How many of the starters are familiar with the positions the Tactic assigns them, per tier. */
export interface FamiliarityTierCounts {
  readonly natural: number;
  readonly competent: number;
  readonly unfamiliar: number;
}

/**
 * Counts a set of Familiarity Tiers. The v1 familiarity summary folds each starter's existing tier
 * for the position their slot assigns through this — derived from the player's position-familiarity
 * tiers and the selection the Tactic makes of them (its "usage"), never assigned directly.
 * Formation- and instruction-level familiarity are deferred to the Training domain.
 */
export const familiarityTierCounts = (
  tiers: ReadonlyArray<FamiliarityTier>,
): FamiliarityTierCounts => {
  let natural = 0;
  let competent = 0;
  for (const tier of tiers) {
    if (tier === "natural") natural += 1;
    else if (tier === "competent") competent += 1;
  }
  return { natural, competent, unfamiliar: tiers.length - natural - competent };
};