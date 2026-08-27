import { POSITION_WEIGHTS, type FamiliarityTier, type PlayerAttributes, type Position } from "./positions.js";

/** Weighted average of Attributes against a Position's weights, scaled from the 1-20 attribute range to 1-100. */
export const positionRating = (attributes: PlayerAttributes, position: Position): number => {
  const weights = POSITION_WEIGHTS[position];
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [attribute, weight] of Object.entries(weights)) {
    const value = attributes[attribute as keyof PlayerAttributes] ?? 1;
    weightedSum += weight * value;
    weightTotal += weight;
  }
  const averageOn20Scale = weightTotal === 0 ? 1 : weightedSum / weightTotal;
  return Math.round(Math.min(100, Math.max(1, averageOn20Scale * 5)));
};

export interface PlayerPosition {
  readonly position: Position;
  readonly familiarity: FamiliarityTier;
}

/** A player's Position Rating at their strongest Natural-tier Position (falls back to any held Position). */
export const overallRating = (
  attributes: PlayerAttributes,
  positions: ReadonlyArray<PlayerPosition>,
): number => {
  const natural = positions.filter((p) => p.familiarity === "natural");
  const candidates = natural.length > 0 ? natural : positions;
  const ratings = candidates.map((p) => positionRating(attributes, p.position));
  return ratings.length > 0 ? Math.max(...ratings) : positionRating(attributes, "ST");
};

const AGE_VALUE_MODIFIER = (age: number): number => {
  if (age <= 21) return 1.2;
  if (age <= 29) return 1.0;
  if (age <= 32) return 0.7;
  return 0.4;
};

/** Integer Credits amount derived from Overall Rating (exponential curve) x age modifier x Potential-gap premium. */
export const transferValue = (
  overall: number,
  age: number,
  potentialAbility: number,
): number => {
  const base = 25_000 * Math.pow(overall / 50, 2.2);
  const gap = Math.max(0, potentialAbility - overall);
  const potentialPremium = 1 + gap / 200;
  return Math.round(base * AGE_VALUE_MODIFIER(age) * potentialPremium);
};
