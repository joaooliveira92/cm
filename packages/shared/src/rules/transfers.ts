import type { StatureTier } from "../content/clubs.js";

/**
 * Fixed Transfer Budget per Stature Tier (Credits) — a per-Season spend-down pool, no
 * replenishment between the pre-season and mid-season windows (ADR-0005/ticket 05). Baked in at
 * Season start from the club's permanently-fixed Stature Tier, never board-set.
 */
export const TRANSFER_BUDGET_BY_TIER: Record<StatureTier, number> = {
  big: 8_000_000,
  mid: 2_500_000,
  small: 750_000,
};

/**
 * Fixed Wage Budget per Stature Tier (Credits/week) — a running cap on the sum of active
 * Contracts' wages, not a spend-down pool (ADR-0005/ticket 05).
 */
export const WAGE_BUDGET_BY_TIER: Record<StatureTier, number> = {
  big: 20_000,
  mid: 8_000,
  small: 3_000,
};

/** Age curve for wage: peak-age players cost the most per unit of Overall Rating, mirroring the
 * shape of `AGE_VALUE_MODIFIER` in ratings.ts but tuned independently for wages. */
const WAGE_AGE_MODIFIER = (age: number): number => {
  if (age <= 21) return 0.8;
  if (age <= 29) return 1.0;
  if (age <= 32) return 0.85;
  return 0.6;
};

/**
 * Weekly wage in Credits — pure formula output from Overall Rating, age, and the
 * Potential-Ability gap (same input shape as `transferValue`, ADR-0005), offered/accepted as-is
 * with no wage-negotiation UI.
 */
export const weeklyWage = (overall: number, age: number, potentialAbility: number): number => {
  const base = 300 * Math.pow(overall / 50, 2.2);
  const gap = Math.max(0, potentialAbility - overall);
  const potentialPremium = 1 + gap / 300;
  return Math.round(base * WAGE_AGE_MODIFIER(age) * potentialPremium);
};

/** Default 1-5 year Contract length used at signing/renewal when the caller doesn't pick one
 * explicitly (ADR-0005: length is set identically at signing or renewal, no negotiation). */
export const DEFAULT_CONTRACT_YEARS = 3;
export const MIN_CONTRACT_YEARS = 1;
export const MAX_CONTRACT_YEARS = 5;

/** An AI-club incoming bid is accepted outright at/above this multiple of Transfer Value
 * (ADR-0005 AI-club selling behavior). */
export const AI_ACCEPT_BID_MULTIPLIER = 1.0;
/** Below this multiple of Transfer Value an AI-club rejects an incoming bid outright. */
export const AI_REJECT_BID_MULTIPLIER = 0.85;
/** An AI-club counters an incoming bid up to exactly Transfer Value. */
export const AI_COUNTER_TARGET_MULTIPLIER = 1.0;
/** An AI-club bidder accepts a counter-offer up to this multiple of Transfer Value. */
export const AI_ACCEPT_COUNTER_MULTIPLIER = 1.15;
