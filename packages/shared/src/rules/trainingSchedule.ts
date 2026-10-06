/**
 * The team training schedule: how the human club spends the **microcycle**, the gap from its last
 * played Matchday to its next Fixture. The Calendar has no days or weeks, so the schedule attaches
 * to that gap rather than to dates, and every gap is planned in the same fixed number of slots.
 * See `.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md`.
 *
 * This module is the vocabulary only: session types, intensities, the named templates, how a
 * schedule is recognised as one of them, and the recovery modifier a schedule applies to
 * between-match Condition recovery.
 */

export const TRAINING_SESSION_TYPES = ["tactical", "technical", "physical", "recovery", "rest"] as const;
export type TrainingSessionType = (typeof TRAINING_SESSION_TYPES)[number];

export const TRAINING_INTENSITIES = ["low", "medium", "high"] as const;
export type TrainingIntensity = (typeof TRAINING_INTENSITIES)[number];

export interface TrainingSession {
  readonly type: TrainingSessionType;
  readonly intensity: TrainingIntensity;
}

/** Slots per microcycle. Fixed, so a three-day gap and a fortnight are planned the same way. */
export const TRAINING_SCHEDULE_SLOTS = 5;

export const TRAINING_TEMPLATE_NAMES = ["balanced", "matchPreparation", "recovery", "heavy"] as const;
export type TrainingTemplateName = (typeof TRAINING_TEMPLATE_NAMES)[number];

const session = (type: TrainingSessionType, intensity: TrainingIntensity): TrainingSession => ({
  type,
  intensity,
});

/** The named schedules. Balanced is what every career starts on and what a club with no saved
 *  schedule reads as; the others are what the manager (and, later, the assistant) picks from. */
export const TRAINING_SCHEDULE_TEMPLATES: Readonly<
  Record<TrainingTemplateName, ReadonlyArray<TrainingSession>>
> = {
  balanced: [
    session("physical", "medium"),
    session("technical", "medium"),
    session("tactical", "medium"),
    session("recovery", "low"),
    session("rest", "low"),
  ],
  matchPreparation: [
    session("technical", "medium"),
    session("tactical", "high"),
    session("tactical", "medium"),
    session("recovery", "low"),
    session("rest", "low"),
  ],
  recovery: [
    session("recovery", "low"),
    session("rest", "low"),
    session("technical", "low"),
    session("tactical", "low"),
    session("recovery", "low"),
  ],
  heavy: [
    session("physical", "high"),
    session("physical", "high"),
    session("technical", "high"),
    session("tactical", "medium"),
    session("recovery", "low"),
  ],
};

export const DEFAULT_TRAINING_SCHEDULE: ReadonlyArray<TrainingSession> = TRAINING_SCHEDULE_TEMPLATES.balanced;

/** True when the two schedules hold the same sessions in the same slots. */
export const sameTrainingSessions = (
  a: ReadonlyArray<TrainingSession>,
  b: ReadonlyArray<TrainingSession>,
): boolean =>
  a.length === b.length &&
  a.every((slot, index) => slot.type === b[index]!.type && slot.intensity === b[index]!.intensity);

/** The template a schedule matches exactly, or `null` for a hand-edited ("Custom") one. Derived on
 *  every read rather than stored, so a stored name can never disagree with the stored sessions. */
export const trainingTemplateOf = (
  sessions: ReadonlyArray<TrainingSession>,
): TrainingTemplateName | null =>
  TRAINING_TEMPLATE_NAMES.find((name) => sameTrainingSessions(TRAINING_SCHEDULE_TEMPLATES[name], sessions)) ??
  null;

/**
 * Per-session recovery contribution weight.
 * A higher weight means more recovery (lighter session).
 * Weights are chosen so Balanced's sum scales to a 1.0 modifier.
 */
const SESSION_RECOVERY_WEIGHT: Record<TrainingSessionType, Record<TrainingIntensity, number>> = {
  rest: { low: 0.250, medium: 0.220, high: 0.180 },
  recovery: { low: 0.200, medium: 0.170, high: 0.130 },
  technical: { low: 0.150, medium: 0.100, high: 0.080 },
  tactical: { low: 0.130, medium: 0.080, high: 0.050 },
  physical: { low: 0.100, medium: 0.050, high: 0.020 },
};

const balancedSum = TRAINING_SCHEDULE_TEMPLATES.balanced.reduce(
  (total, s) => total + SESSION_RECOVERY_WEIGHT[s.type][s.intensity],
  0,
);

/** Pre-computed modifier for each named template, clamped to the spec's band. */
const clamped = (raw: number): number => Math.min(Math.max(raw, 0.9), 1.1);
export const TRAINING_TEMPLATE_RECOVERY_MODIFIERS: Record<TrainingTemplateName, number> = {
  balanced: 1.0,
  matchPreparation: clamped(TRAINING_SCHEDULE_TEMPLATES.matchPreparation.reduce(
    (t, s) => t + SESSION_RECOVERY_WEIGHT[s.type][s.intensity], 0,
  ) / balancedSum),
  recovery: clamped(TRAINING_SCHEDULE_TEMPLATES.recovery.reduce(
    (t, s) => t + SESSION_RECOVERY_WEIGHT[s.type][s.intensity], 0,
  ) / balancedSum),
  heavy: clamped(TRAINING_SCHEDULE_TEMPLATES.heavy.reduce(
    (t, s) => t + SESSION_RECOVERY_WEIGHT[s.type][s.intensity], 0,
  ) / balancedSum),
};

/**
 * The recovery modifier a schedule applies to between-match Condition recovery.
 * Balanced gives exactly 1. Every schedule's modifier lies within 0.9 to 1.1,
 * inside Regimen's 0.8 to 1.2 range.
 */
export const scheduleRecoveryModifier = (
  sessions: ReadonlyArray<TrainingSession>,
): number => {
  const template = trainingTemplateOf(sessions);
  if (template !== null) return TRAINING_TEMPLATE_RECOVERY_MODIFIERS[template];
  const raw = sessions.reduce(
    (total, s) => total + SESSION_RECOVERY_WEIGHT[s.type][s.intensity],
    0,
  ) / balancedSum;
  return clamped(raw);
};
