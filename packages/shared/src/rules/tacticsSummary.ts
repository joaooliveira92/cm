import type { FamiliarityTier } from "./positions.js";

/**
 * The selection summary's numbers, derived from the registered squad and the active Tactic's slots.
 *
 * Both derivations live here in `shared` so the overview's snapshot read and any renderer that
 * shows it compute the same partition and the same counts from the same inputs — one home per
 * meaning, per the packages rule. Each is pure and takes facts, never a database.
 */

/** A registered squad partitioned into the players a Tactic starts and everyone else. */
export interface SelectionPartition {
  /** The registered players named in the active Tactic's slots, in slot order. A slot whose player
   *  has since left the squad contributes to neither list — that gap is a readiness blocker, not a
   *  starter or a substitute. */
  readonly starters: ReadonlyArray<string>;
  /** Every registered player who is not named in any slot. */
  readonly substitutes: ReadonlyArray<string>;
}

/**
 * Splits a registered squad into starters (the players a Tactic's slots name, restricted to those
 * still registered, in slot order) and substitutes (every registered player not named anywhere).
 * Starters and substitutes are a partition of the squad: the union is the squad and the two lists
 * never overlap.
 */
export const partitionSelection = (
  squadPlayerIds: ReadonlyArray<string>,
  slotPlayerIds: ReadonlyArray<string>,
): SelectionPartition => {
  const slotSet = new Set(slotPlayerIds);
  const squadSet = new Set(squadPlayerIds);
  const starters = slotPlayerIds.filter((id) => squadSet.has(id));
  const substitutes = squadPlayerIds.filter((id) => !slotSet.has(id));
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