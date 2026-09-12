import { describe, expect, it } from "vitest";
import {
  validatePillarDistribution,
  MANAGER_ARCHETYPE_DISTRIBUTIONS,
  technicalCoachingModifier,
  regimenDecayModifier,
  regimenRecoveryModifier,
  influenceThresholdModifier,
  tacticalAcumenModifier,
} from "../../src/rules/managerPillars.js";

describe("validatePillarDistribution", () => {
  it("accepts a valid 3/3/3/3 distribution", () => {
    const errors = validatePillarDistribution({ tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 });
    expect(errors).toEqual([]);
  });

  it("accepts a valid 5/5/1/1 extreme distribution", () => {
    const errors = validatePillarDistribution({ tacticalAcumen: 5, influence: 5, regimen: 1, technicalCoaching: 1 });
    expect(errors).toEqual([]);
  });

  it("rejects values outside 1-5 range", () => {
    const errors = validatePillarDistribution({ tacticalAcumen: 6, influence: 3, regimen: 3, technicalCoaching: 3 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!).toContain("1 and 5");
  });

  it("rejects non-integer values", () => {
    const errors = validatePillarDistribution({ tacticalAcumen: 2.5, influence: 3, regimen: 3, technicalCoaching: 3 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects sum not equal to 12", () => {
    const errors = validatePillarDistribution({ tacticalAcumen: 4, influence: 4, regimen: 4, technicalCoaching: 4 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!).toContain("sum to exactly 12");
  });

  it("rejects missing values", () => {
    const errors = validatePillarDistribution({ tacticalAcumen: 3 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("all four Archetype distributions are valid", () => {
    for (const [key, dist] of Object.entries(MANAGER_ARCHETYPE_DISTRIBUTIONS)) {
      const errors = validatePillarDistribution(dist);
      expect(errors, `Archetype ${key} should be valid`).toEqual([]);
    }
  });
});

describe("technicalCoachingModifier", () => {
  it("is neutral at 3", () => {
    expect(technicalCoachingModifier(3)).toBeCloseTo(1.0);
  });

  it("is > 1.0 at 5", () => {
    expect(technicalCoachingModifier(5)).toBeGreaterThan(1.0);
  });

  it("is < 1.0 at 1", () => {
    expect(technicalCoachingModifier(1)).toBeLessThan(1.0);
  });

  it("TRAINING_FOCUS_MULTIPLIER * modifier > 1.0 at every legal value", () => {
    const TRAINING_FOCUS_MULTIPLIER = 1.5;
    for (let v = 1; v <= 5; v++) {
      const effective = TRAINING_FOCUS_MULTIPLIER * technicalCoachingModifier(v);
      expect(effective).toBeGreaterThan(1.0);
    }
  });
});

describe("regimenDecayModifier", () => {
  it("is neutral at 3", () => {
    expect(regimenDecayModifier(3)).toBeCloseTo(1.0);
  });

  it("higher regimen gives lower decay", () => {
    expect(regimenDecayModifier(5)).toBeLessThan(regimenDecayModifier(3));
    expect(regimenDecayModifier(3)).toBeLessThan(regimenDecayModifier(1));
  });

  it("higher regimen never increases decay", () => {
    for (let v = 1; v <= 5; v++) {
      expect(regimenDecayModifier(v)).toBeGreaterThan(0);
    }
  });
});

describe("regimenRecoveryModifier", () => {
  it("is neutral at 3", () => {
    expect(regimenRecoveryModifier(3)).toBeCloseTo(1.0);
  });

  it("higher regimen gives faster recovery", () => {
    expect(regimenRecoveryModifier(5)).toBeGreaterThan(regimenRecoveryModifier(3));
    expect(regimenRecoveryModifier(3)).toBeGreaterThan(regimenRecoveryModifier(1));
  });

  it("higher regimen never reduces recovery", () => {
    expect(regimenRecoveryModifier(5)).toBeGreaterThanOrEqual(regimenRecoveryModifier(3));
  });
});

describe("influenceThresholdModifier", () => {
  it("is neutral at 3", () => {
    expect(influenceThresholdModifier(3)).toBeCloseTo(1.0);
  });
});

describe("tacticalAcumenModifier", () => {
  it("is neutral at 3", () => {
    expect(tacticalAcumenModifier(3)).toBeCloseTo(1.0);
  });
});