import { LINES, SIDES, POSITIONAL_RATING_MAX, type PositionalRatings } from "./positionalRatings.js";

/**
 * What a manager can retrain a player toward: one positional line or one side. The two sets share
 * no code, so a single string names either. See the Agent Note
 * `.agents/notes/proposed/feature/2026-09-29-positions-retrain-through-training-only.md`.
 */
export const RETRAINING_TARGETS = [...LINES, ...SIDES] as const;
export type RetrainingTarget = (typeof RETRAINING_TARGETS)[number];

const isLine = (target: RetrainingTarget): target is (typeof LINES)[number] =>
  (LINES as ReadonlyArray<string>).includes(target);

export const ratingOf = (ratings: PositionalRatings, target: RetrainingTarget): number =>
  isLine(target) ? ratings.lines[target] : ratings.sides[target as (typeof SIDES)[number]];

const withRating = (ratings: PositionalRatings, target: RetrainingTarget, value: number): PositionalRatings =>
  isLine(target)
    ? { ...ratings, lines: { ...ratings.lines, [target]: value } }
    : { ...ratings, sides: { ...ratings.sides, [target]: value } };

/** A Microcycle's gain at the base rate, before age and determination: about a point every four. */
const BASE_GAIN = 0.25;

/** Younger players retrain faster; past 30 it slows sharply. Tuning constants. */
const ageFactor = (age: number): number => (age <= 21 ? 1.4 : age <= 25 ? 1.2 : age <= 29 ? 1 : age <= 32 ? 0.7 : 0.4);

/**
 * How far one Microcycle of training moves a retraining target, in rating points: the base rate
 * scaled by age and by determination (1-20, where 10 is neutral-ish: 0.64 at 1, 1.4 at 20).
 * Deterministic: retraining draws no randomness.
 */
export const retrainingGain = (age: number, determination: number): number =>
  BASE_GAIN * ageFactor(age) * (0.6 + 0.04 * determination);

/**
 * One Microcycle of retraining: the gain accrues as fractional progress, and each whole point of
 * progress raises the target rating by one, up to 20. Nothing else changes. At 20 there is nothing
 * left to gain, so progress resets rather than banking.
 */
export const applyRetraining = (
  ratings: PositionalRatings,
  target: RetrainingTarget,
  progress: number,
  gain: number,
): { readonly ratings: PositionalRatings; readonly progress: number } => {
  let value = ratingOf(ratings, target);
  let banked = progress + gain;
  while (banked >= 1 && value < POSITIONAL_RATING_MAX) {
    value += 1;
    banked -= 1;
  }
  return { ratings: withRating(ratings, target, value), progress: value >= POSITIONAL_RATING_MAX ? 0 : banked };
};
