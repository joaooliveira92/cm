import { attributeCeilingOn20Scale } from "./generation.js";
import {
  ALL_ATTRIBUTES,
  CATEGORY_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  type Attribute,
  type Category,
  type HiddenAttribute,
  type PlayerAttributes,
} from "./positions.js";

export { attributeCeilingOn20Scale };

/**
 * Player Development + Training Focus (ADR-0011, spec: `.scratch/training/spec.md`). The pure,
 * deterministic core of both systems: each Attribute moves a fixed fraction of the gap toward the
 * age-appropriate ceiling (the same `attributeCeilingOn20Scale` generation uses) every season, and
 * a focused Category multiplies that step. No RNG, no seed — a pure function of (attributes, age,
 * Potential Ability, focus), trivially replayable from event history.
 */

/** How much of the remaining gap each Attribute closes toward its age-ceiling per season (~65%). */
export const PLAYER_DEVELOPMENT_FRACTION = 0.65;

/** The focused Category's seasonal growth fraction is multiplied by this (~1.5x). Purely additive —
 * it takes nothing from the other three Categories, and the fraction-of-gap step already self-clamps
 * at the ceiling, so no separate cap is needed. */
export const TRAINING_FOCUS_MULTIPLIER = 1.5;

/**
 * Pure per-season development step: returns the player's next-season Attribute set given their
 * current Attributes, age, Potential Ability, and an optional focused Category. Each Attribute moves
 * `PLAYER_DEVELOPMENT_FRACTION` of the remaining gap to its age-ceiling; Attributes in the focused
 * Category have that step multiplied by `TRAINING_FOCUS_MULTIPLIER`. Hidden attributes develop
 * identically (never focused). Self-clamps at the ceiling, and treats decline as a falling ceiling.
 */
export const developPlayer = (
  attributes: PlayerAttributes,
  age: number,
  potentialAbility: number,
  focus?: Category,
): PlayerAttributes => {
  const next = { ...attributes } as PlayerAttributes;

  const step = (attribute: Attribute | HiddenAttribute, current: number, fraction: number): number =>
    Math.round(current + (attributeCeilingOn20Scale(attribute, age, potentialAbility) - current) * fraction);

  for (const attribute of ALL_ATTRIBUTES) {
    const current = next[attribute];
    if (current === undefined) continue;
    const focused = focus !== undefined && CATEGORY_ATTRIBUTES[focus].includes(attribute);
    next[attribute] = step(attribute, current, focused ? PLAYER_DEVELOPMENT_FRACTION * TRAINING_FOCUS_MULTIPLIER : PLAYER_DEVELOPMENT_FRACTION);
  }

  for (const attribute of HIDDEN_ATTRIBUTES) {
    const current = next[attribute];
    if (current === undefined) continue;
    next[attribute] = step(attribute, current, PLAYER_DEVELOPMENT_FRACTION);
  }

  return next;
};