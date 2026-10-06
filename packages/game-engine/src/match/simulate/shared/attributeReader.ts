import type { MatchPlayerInput } from "../../types.js";

export const attributeValue = (player: MatchPlayerInput, attr: string): number => {
  const attrs = player.attributes as Record<string, number | undefined>;
  return attrs[attr] ?? 10;
};

const SUITABILITY_SCALED_ATTRIBUTES = new Set(["positioning", "decisions", "composure"]);

export const scaledAttributeValue = (
  player: MatchPlayerInput,
  attr: string,
  suitabilityFactor: number,
): number => {
  const base = attributeValue(player, attr);
  return SUITABILITY_SCALED_ATTRIBUTES.has(attr) ? base * suitabilityFactor : base;
};