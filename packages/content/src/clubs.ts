export const STATURE_TIERS = ["big", "mid", "small"] as const;

/**
 * A club's standing among the clubs of **its own competition** — not across the world.
 *
 * The absolute reading is the competition's: how strong a `big` club actually is depends on its
 * competition's tier and its nation's prior, which is what `clubGeneration.ts` computes. Keeping
 * the enum relative is what lets a four-tier pyramid work without widening it into a world-wide
 * scale that every consumer of the three values would have to be retuned against.
 */
export type StatureTier = (typeof STATURE_TIERS)[number];
