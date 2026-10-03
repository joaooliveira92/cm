import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRAINING_SCHEDULE,
  TRAINING_INTENSITIES,
  TRAINING_SCHEDULE_SLOTS,
  TRAINING_SCHEDULE_TEMPLATES,
  TRAINING_SESSION_TYPES,
  TRAINING_TEMPLATE_NAMES,
  TRAINING_TEMPLATE_RECOVERY_MODIFIERS,
  sameTrainingSessions,
  scheduleRecoveryModifier,
  trainingTemplateOf,
  type TrainingSession,
} from "../../src/rules/trainingSchedule.js";

describe("the training schedule model", () => {
  it("offers a closed set of session types and intensities", () => {
    expect(TRAINING_SESSION_TYPES).toEqual(["tactical", "technical", "physical", "recovery", "rest"]);
    expect(TRAINING_INTENSITIES).toEqual(["low", "medium", "high"]);
  });

  it("plans every microcycle in the same five slots, whatever its length", () => {
    expect(TRAINING_SCHEDULE_SLOTS).toBe(5);
    for (const name of TRAINING_TEMPLATE_NAMES) {
      expect(TRAINING_SCHEDULE_TEMPLATES[name]).toHaveLength(TRAINING_SCHEDULE_SLOTS);
    }
  });

  it("names four templates, and a career with no schedule reads as Balanced", () => {
    expect(TRAINING_TEMPLATE_NAMES).toEqual(["balanced", "matchPreparation", "recovery", "heavy"]);
    expect(DEFAULT_TRAINING_SCHEDULE).toEqual(TRAINING_SCHEDULE_TEMPLATES.balanced);
  });

  it("keeps the templates distinct, so a schedule names at most one of them", () => {
    const keys = TRAINING_TEMPLATE_NAMES.map((name) => JSON.stringify(TRAINING_SCHEDULE_TEMPLATES[name]));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("recognises a template from its sessions, and a hand-edited schedule as custom", () => {
    for (const name of TRAINING_TEMPLATE_NAMES) {
      expect(trainingTemplateOf(TRAINING_SCHEDULE_TEMPLATES[name])).toBe(name);
    }
    const edited: TrainingSession[] = [...TRAINING_SCHEDULE_TEMPLATES.balanced];
    edited[0] = { type: "rest", intensity: "low" };
    expect(trainingTemplateOf(edited)).toBeNull();
  });

  it("compares two schedules session by session", () => {
    const balanced = TRAINING_SCHEDULE_TEMPLATES.balanced;
    expect(sameTrainingSessions(balanced, [...balanced])).toBe(true);
    expect(sameTrainingSessions(balanced, TRAINING_SCHEDULE_TEMPLATES.heavy)).toBe(false);
    expect(sameTrainingSessions(balanced, balanced.slice(0, 4))).toBe(false);
  });
});

describe("scheduleRecoveryModifier", () => {
  it("gives Balanced exactly 1.0", () => {
    expect(scheduleRecoveryModifier(TRAINING_SCHEDULE_TEMPLATES.balanced)).toBe(1.0);
  });

  it("gives Recovery a higher modifier than Balanced", () => {
    expect(TRAINING_TEMPLATE_RECOVERY_MODIFIERS.recovery).toBeGreaterThan(1.0);
  });

  it("gives Heavy a lower modifier than Balanced", () => {
    expect(TRAINING_TEMPLATE_RECOVERY_MODIFIERS.heavy).toBeLessThan(1.0);
  });

  it("keeps every template's modifier within 0.9 to 1.1", () => {
    for (const name of TRAINING_TEMPLATE_NAMES) {
      const mod = TRAINING_TEMPLATE_RECOVERY_MODIFIERS[name];
      expect(mod).toBeGreaterThanOrEqual(0.9);
      expect(mod).toBeLessThanOrEqual(1.1);
    }
  });

  it("clamps a custom schedule's modifier to the band", () => {
    const allRest: TrainingSession[] = [
      { type: "rest", intensity: "low" },
      { type: "rest", intensity: "low" },
      { type: "rest", intensity: "low" },
      { type: "rest", intensity: "low" },
      { type: "rest", intensity: "low" },
    ];
    expect(scheduleRecoveryModifier(allRest)).toBeLessThanOrEqual(1.1);

    const allPhysicalHigh: TrainingSession[] = [
      { type: "physical", intensity: "high" },
      { type: "physical", intensity: "high" },
      { type: "physical", intensity: "high" },
      { type: "physical", intensity: "high" },
      { type: "physical", intensity: "high" },
    ];
    expect(scheduleRecoveryModifier(allPhysicalHigh)).toBeGreaterThanOrEqual(0.9);
  });

  it("gives a Recovery schedule a higher modifier than a Heavy one from the same start", () => {
    const recovery = scheduleRecoveryModifier(TRAINING_SCHEDULE_TEMPLATES.recovery);
    const heavy = scheduleRecoveryModifier(TRAINING_SCHEDULE_TEMPLATES.heavy);
    expect(recovery).toBeGreaterThan(heavy);
  });
});
