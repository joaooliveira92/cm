/** Tuning constants for the match simulation loop, and the one numeric helper they're used with. */

export const HALF_LENGTH_MINUTES = 45;
export const HOME_ADVANTAGE_MULTIPLIER = 1.075;
export const STOPPAGE_MIN_MINUTES = 1;
export const STOPPAGE_MAX_MINUTES = 5;

// ─── Attack event chance ────────────────────────────────────────────────────

export const BASE_ATTACK_EVENT_CHANCE = 0.16;

// ─── Chance type weights (relative, sum need not be 1 — they're normalised at use) ──
// These are multiplied by the per-slot behaviour weights before normalisation.

export const CHANCE_TYPE_WEIGHTS = {
  throughBall: 1.0,
  cross: 1.0,
  longShot: 0.7,
  runWithBall: 0.8,
  holdUpLayOff: 0.6,
  counter: 0.5,
} as const;

// ─── Outcome probabilities (relative shares within a resolved chance) ────────

/** Base goal probability at equal attacker/defender quality. Adjusted by attributes at runtime. */
export const BASE_GOAL_PROBABILITY = 0.15;

/** Share of non-goal outcomes that are saved (on target but kept out). */
export const SAVE_SHARE = 0.45;

/** Share of non-goal outcomes that miss the target entirely. */
export const MISS_SHARE = 0.40;

// remainder is the share blocked / deflected (no event emitted for simplicity v1)

// ─── Foul & card constants ──────────────────────────────────────────────────

export const BASE_FOUL_PROBABILITY = 0.04;
export const YELLOW_CARD_SHARE_OF_FOULS = 0.15;
export const RED_CARD_SHARE_OF_CARDS = 0.08;

// ─── Offside constants ──────────────────────────────────────────────────────

export const BASE_OFFSIDE_PROBABILITY = 0.03;

// ─── Injury constants (unchanged from v1) ────────────────────────────────────

/** Scaling for the per-minute non-contact (fatigue) injury risk (ticket 04). */
export const NON_CONTACT_RISK_SCALE = 0.012;
/** Base probability a given minute's play includes a physical duel that can draw a collision check (ticket 05/06). */
export const DUEL_CHECK_BASE = 0.06;
/** The `BaseCollision` constant in the contact injury risk formula (ticket 05/06). */
export const BASE_COLLISION = 0.05;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Attribute effect scaling constant — how much a 1-point attribute difference shifts probability. */
export const ATTRIBUTE_EFFECT_SCALE = 0.02;

// ─── Set piece constants ─────────────────────────────────────────────────────

/** Probability that a saved/blocked shot (ShotOnTarget) or cleared cross leads to a corner. */
export const CORNER_CHANCE = 0.25;
/** Base goal probability at equal attacker/defender quality for corner headers. */
export const CORNER_GOAL_BASE = 0.08;
/** Share of non-goal corner outcomes that are saved (on target but kept out). */
export const CORNER_SAVE_SHARE = 0.40;
/** Share of non-goal corner outcomes that miss the target entirely. */
export const CORNER_MISS_SHARE = 0.50;

// Corner instructions (set-piece-roles 02). Each takes effect only when a role or delivery is set; with
// everything at default a corner resolves exactly as before.

/** Attack multiplier when the header was picked by a role that matches the delivery. */
export const CORNER_ROLE_MATCH_BONUS = 1.1;
/** Attack multiplier when a near-post flick-on finds a far-post attacker. */
export const CORNER_FLICK_ON_BONUS = 1.1;
/** Defence multiplier when a teammate challenges the goalkeeper. */
export const CORNER_CHALLENGE_KEEPER_FACTOR = 0.92;
/** Attack multiplier with nobody in the box; it rises to 1 with every outfield player there. */
export const CORNER_BOX_PRESENCE_FLOOR = 0.7;
/** Base goal probability for a corner played to the edge of the area and shot first time. */
export const CORNER_VOLLEY_GOAL_BASE = 0.05;
/** Share of non-goal edge-of-area shots that are saved, and that miss. */
export const CORNER_VOLLEY_SAVE_SHARE = 0.35;
export const CORNER_VOLLEY_MISS_SHARE = 0.65;

// Defending corner roles (set-piece-roles 03): multipliers on the defence's value, each 1 at default.

/** Defence multiplier with no outfield player back to defend; it rises to 1 with all of them back. */
export const CORNER_DEFENCE_PRESENCE_FLOOR = 0.75;
/** Defence multiplier when a zonal defender stands at the post the corner is aimed at. */
export const CORNER_ZONAL_BONUS = 1.08;
/** Defence multiplier when a defender man-marks. */
export const CORNER_MAN_MARK_BONUS = 1.05;
/** Defence multiplier when a defender marks the kind of player who attacks the ball (tall or small). */
export const CORNER_MARK_TARGET_BONUS = 1.08;
/** Defence multiplier against a shot from the edge of the area when a defender closes down. */
export const CORNER_CLOSE_DOWN_BONUS = 1.1;

// Free-kick instructions (set-piece-roles 04). Each takes effect only when a role or delivery is set.

/** Attack multiplier on a direct free kick when a teammate disrupts the wall. */
export const FREE_KICK_DISRUPT_WALL_BONUS = 1.06;
/** Attack multiplier on a direct free kick when a teammate stands with the taker or runs over the ball. */
export const FREE_KICK_DECOY_BONUS = 1.04;
/** Multiplier on the goalkeeper's part of the defence when a teammate disrupts him. */
export const FREE_KICK_DISRUPT_KEEPER_FACTOR = 0.94;
/** Defence bonus per player forming the wall against a direct free kick, up to `FREE_KICK_WALL_MAX`. */
export const FREE_KICK_WALL_BONUS_PER_PLAYER = 0.03;
export const FREE_KICK_WALL_MAX = 4;

/** Probability that a foul leads to a free kick (foul in attacking third). */
export const FOUL_LEADS_TO_FREE_KICK = 0.15;
/** Base goal probability at equal attacker/defender quality for free kicks. */
export const FREE_KICK_GOAL_BASE = 0.10;
/** Share of non-goal free kick outcomes that are saved. */
export const FREE_KICK_SAVE_SHARE = 0.35;
/** Share of non-goal free kick outcomes that miss. */
export const FREE_KICK_MISS_SHARE = 0.45;

/** Probability that a foul leads to a penalty (foul in the box). */
export const FOUL_LEADS_TO_PENALTY = 0.08;
/** Base goal probability for penalties (finishing vs GK reflexes). */
export const PENALTY_GOAL_BASE = 0.18;
/** Share of non-goal penalty outcomes that are saved. */
export const PENALTY_SAVE_SHARE = 0.50;
/** Share of non-goal penalty outcomes that miss. */
export const PENALTY_MISS_SHARE = 0.30;