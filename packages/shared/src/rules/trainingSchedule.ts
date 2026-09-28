/**
 * The team training schedule: how the human club spends the **microcycle**, the gap from its last
 * played Matchday to its next Fixture. The Calendar has no days or weeks, so the schedule attaches
 * to that gap rather than to dates, and every gap is planned in the same fixed number of slots.
 * See `.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md`.
 *
 * This module is the vocabulary only: session types, intensities, the named templates, and how a
 * schedule is recognised as one of them. What a schedule does to Condition is a separate function
 * (training-schedule-and-delegation 04).
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
