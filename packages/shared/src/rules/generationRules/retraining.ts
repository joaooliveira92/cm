import { LINES, SIDES, POSITIONAL_RATING_MAX, type PositionalRatings } from "../playerRatings/positionalRatings.js";

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

const BASE_GAIN = 0.25;

const ageFactor = (age: number): number => (age <= 21 ? 1.4 : age <= 25 ? 1.2 : age <= 29 ? 1 : age <= 32 ? 0.7 : 0.4);

export const retrainingGain = (age: number, determination: number): number =>
  BASE_GAIN * ageFactor(age) * (0.6 + 0.04 * determination);

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