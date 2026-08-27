import type { RandomSource } from "@cm-clone/shared";
import { pickRandom } from "../rng.js";
import type { InjurySeverity, InjuryTier, InjuryTrigger, InjuryType } from "./events.js";

/**
 * Injury severity & type resolution (ticket 03). Pure rolls: the engine's single shared pipeline
 * entry the two trigger paths (ticket 04 non-contact, ticket 06 contact) both feed into. Severity is
 * rolled through an Injury Matrix biased by trigger — non-contact leans muscular/fatigue, contact
 * leans structural — and scaled by Injury Proneness, which nudges the cutoffs toward worse outcomes.
 */

const CONTACT_TYPES: ReadonlyArray<InjuryType> = ["brokenToe", "twistedAnkle", "deadLeg"];
const NON_CONTACT_TYPES: ReadonlyArray<InjuryType> = ["hamstring", "calf", "strain"];

/** Roll thresholds on [0,1): below `light` is Light, below `medium` is Medium, else Severe. */
const SEVERITY_CUTOFFS: Record<InjuryTrigger, { readonly light: number; readonly medium: number }> = {
  contact: { light: 0.45, medium: 0.8 },
  "non-contact": { light: 0.55, medium: 0.88 },
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** An orange (Light/Medium) injury that stays on drops the player's Condition to this % (ticket 03). */
export const ORANGE_CONDITION_FLOOR = 35;
/** A red (Severe) injury is forced off with Condition effectively zeroed (ticket 04/07). */
export const RED_CONDITION_FLOOR = 0;
/** Fraction Pace / Acceleration / Agility are cut to for the remainder of the match after an orange knock. */
export const PENALTY_SLASH_FACTOR = 0.5;

/** Injury Proneness (1-20) nudges the severity matrix: more prone -> more severe on the same roll. */
const pronenessAdjustment = (injuryProneness: number): number => clamp((injuryProneness - 10) * 0.01, -0.15, 0.15);

export const resolveSeverity = (
  trigger: InjuryTrigger,
  injuryProneness: number,
  random: RandomSource,
): InjurySeverity => {
  const roll = random.next();
  const adjustment = pronenessAdjustment(injuryProneness);
  const cutoffs = SEVERITY_CUTOFFS[trigger];
  if (roll < cutoffs.light + adjustment) return "light";
  if (roll < cutoffs.medium + adjustment) return "medium";
  return "severe";
};

export const resolveType = (trigger: InjuryTrigger, random: RandomSource): InjuryType =>
  pickRandom(trigger === "contact" ? CONTACT_TYPES : NON_CONTACT_TYPES, random);

/** Orange (Light/Medium — can play on or be dragged off) or Red (Severe — must come off). */
export const tierForSeverity = (severity: InjurySeverity): InjuryTier =>
  severity === "severe" ? "red" : "orange";

/** The single roll both triggers route through (ticket 03's shared entry point). */
export interface ResolvedInjury {
  readonly severity: InjurySeverity;
  readonly type: InjuryType;
  readonly tier: InjuryTier;
}

export const rollInjury = (
  trigger: InjuryTrigger,
  injuryProneness: number,
  random: RandomSource,
): ResolvedInjury => {
  const severity = resolveSeverity(trigger, injuryProneness, random);
  return { severity, type: resolveType(trigger, random), tier: tierForSeverity(severity) };
};