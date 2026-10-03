import {
  trainingTemplateOf,
  type TrainingIntensity,
  type TrainingSession,
  type TrainingSessionType,
  type TrainingTemplateName,
} from "@cm-clone/shared";

/** The Training Schedule's words, shared by the schedule screen and the Overview's Schedule card. */
export const SESSION_TYPE_LABELS: Readonly<Record<TrainingSessionType, string>> = {
  tactical: "Tactical",
  technical: "Technical",
  physical: "Physical",
  recovery: "Recovery",
  rest: "Rest",
};

export const INTENSITY_LABELS: Readonly<Record<TrainingIntensity, string>> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const TEMPLATE_LABELS: Readonly<Record<TrainingTemplateName, string>> = {
  balanced: "Balanced",
  matchPreparation: "Match Preparation",
  recovery: "Recovery",
  heavy: "Heavy",
};

/** The template name a schedule matches, or "Custom" for a hand-edited one. */
export const templateLabel = (sessions: ReadonlyArray<TrainingSession>): string => {
  const template = trainingTemplateOf(sessions);
  return template === null ? "Custom" : TEMPLATE_LABELS[template];
};
