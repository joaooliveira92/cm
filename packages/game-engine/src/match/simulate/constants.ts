/** Tuning constants for the match simulation loop, and the one numeric helper they're used with. */

export const HALF_LENGTH_MINUTES = 45;
export const HOME_ADVANTAGE_MULTIPLIER = 1.075;
export const STOPPAGE_MIN_MINUTES = 1;
export const STOPPAGE_MAX_MINUTES = 5;

export const BASE_ATTACK_EVENT_CHANCE = 0.16;
export const GOAL_SHARE = 0.12;
export const BIG_CHANCE_SHARE = 0.18;
export const SHOT_ON_TARGET_SHARE = 0.35;
// remainder (1 - the three shares above) is ShotMissed

export const BASE_CARD_PROBABILITY = 0.01;
export const RED_CARD_SHARE_OF_CARDS = 0.08;

/** Scaling for the per-minute non-contact (fatigue) injury risk (ticket 04). */
export const NON_CONTACT_RISK_SCALE = 0.012;
/** Base probability a given minute's play includes a physical duel that can draw a collision check (ticket 05/06). */
export const DUEL_CHECK_BASE = 0.06;
/** The `BaseCollision` constant in the contact injury risk formula (ticket 05/06). */
export const BASE_COLLISION = 0.05;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
