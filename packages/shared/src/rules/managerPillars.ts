// ---------------------------------------------------------------------------
// Manager Pillars — four 1-5 dimensions summing to 12, immutable for the life of the career
// ---------------------------------------------------------------------------

export const MANAGER_PILLARS = [
  "tacticalAcumen",
  "influence",
  "regimen",
  "technicalCoaching",
] as const;

export type ManagerPillar = (typeof MANAGER_PILLARS)[number];

export const MANAGER_ARCHETYPES = [
  "professor",
  "motivator",
  "sergeant",
  "academy_head",
  "custom",
] as const;

export type ManagerArchetype = (typeof MANAGER_ARCHETYPES)[number];

export interface PillarDistribution {
  readonly tacticalAcumen: number;
  readonly influence: number;
  readonly regimen: number;
  readonly technicalCoaching: number;
}

/**
 * Predefined Archetype distributions. Each is a permutation of {5, 4, 2, 1}
 * so each has one defining mastery (5), one strong competency (4), one
 * below-average competency (2), and one severe weakness (1).
 */
export const MANAGER_ARCHETYPE_DISTRIBUTIONS: Record<
  Exclude<ManagerArchetype, "custom">,
  PillarDistribution
> = {
  professor: { tacticalAcumen: 5, influence: 1, regimen: 2, technicalCoaching: 4 },
  motivator: { tacticalAcumen: 2, influence: 5, regimen: 4, technicalCoaching: 1 },
  sergeant: { tacticalAcumen: 1, influence: 2, regimen: 5, technicalCoaching: 4 },
  academy_head: { tacticalAcumen: 2, influence: 4, regimen: 1, technicalCoaching: 5 },
};

/**
 * Validate a Pillar Distribution. Returns an array of error messages (empty if valid).
 * Rules:
 * - Each pillar must be an integer between 1 and 5
 * - Sum must equal exactly 12
 */
export const validatePillarDistribution = (
  distribution: Partial<PillarDistribution>,
): ReadonlyArray<string> => {
  const errors: string[] = [];

  const tacticalAcumen = distribution.tacticalAcumen;
  const influence = distribution.influence;
  const regimen = distribution.regimen;
  const technicalCoaching = distribution.technicalCoaching;

  if (typeof tacticalAcumen !== "number" || !Number.isInteger(tacticalAcumen) || tacticalAcumen < 1 || tacticalAcumen > 5) {
    errors.push("Tactical Acumen must be an integer between 1 and 5");
  }
  if (typeof influence !== "number" || !Number.isInteger(influence) || influence < 1 || influence > 5) {
    errors.push("Influence must be an integer between 1 and 5");
  }
  if (typeof regimen !== "number" || !Number.isInteger(regimen) || regimen < 1 || regimen > 5) {
    errors.push("Regimen must be an integer between 1 and 5");
  }
  if (typeof technicalCoaching !== "number" || !Number.isInteger(technicalCoaching) || technicalCoaching < 1 || technicalCoaching > 5) {
    errors.push("Technical Coaching must be an integer between 1 and 5");
  }

  if (errors.length === 0) {
    const sum = tacticalAcumen! + influence! + regimen! + technicalCoaching!;
    if (sum !== 12) {
      errors.push(`Pillar values must sum to exactly 12 (current sum: ${sum}). ${12 - sum > 0 ? `${12 - sum} point(s) remaining` : `${sum - 12} point(s) over`}`);
    }
  }

  return errors;
};

/**
 * The effective Technical Coaching modifier on `TRAINING_FOCUS_MULTIPLIER`.
 * Hard invariant: `TRAINING_FOCUS_MULTIPLIER * technicalCoachingModifier(v) > 1.0`
 * for every legal v (1-5), so setting a Focus is never worse than setting none.
 */
export const technicalCoachingModifier = (value: number): number => {
  // Neutral at 3 (no change), linear scale
  return 0.7 + value * 0.1;
};

/**
 * The effective Regimen modifier on Condition decay/recovery.
 * Higher Regimen: lower decay, faster recovery (multiplier < 1 for decay, > 1 for recovery).
 * Directional invariant: higher Regimen never increases decay or reduces recovery.
 */
export const regimenDecayModifier = (value: number): number => {
  // Neutral at 3, linear scale: 3 = 1.0, 5 = 0.8 (less decay), 1 = 1.2 (more decay)
  return 1.3 - value * 0.1;
};

export const regimenRecoveryModifier = (value: number): number => {
  // Neutral at 3, linear scale: 3 = 1.0, 5 = 1.2 (faster recovery), 1 = 0.8 (slower recovery)
  return 0.7 + value * 0.1;
};

/**
 * The effective Influence modifier on seller acceptance/counter thresholds.
 * Neutral at 3: no change. Higher influence shifts the thresholds in the buyer's favor.
 */
export const influenceThresholdModifier = (value: number): number => {
  // Neutral at 3 = 1.0, 5 = ~1.1 (easier to accept), 1 = ~0.9 (harder)
  return 0.7 + value * 0.1;
};

/**
 * The effective Tactical Acumen modifier on tactical instruction effectiveness.
 * Neutral at 3: no change. Higher acumen amplifies instruction effects.
 */
export const tacticalAcumenModifier = (value: number): number => {
  // Neutral at 3 = 1.0, 5 = 1.1 (stronger effect), 1 = 0.9 (weaker effect)
  return 0.7 + value * 0.1;
};