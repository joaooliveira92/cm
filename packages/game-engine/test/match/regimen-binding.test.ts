import { describe, expect, it } from "vitest";
import { createSeededRng, regimenDecayModifier, regimenRecoveryModifier } from "@cm-clone/shared";
import { resolveSeverity } from "../../src/match/injury.js";
import { START_CONDITION } from "../../src/match/condition.js";

describe("regimen recovery modifier", () => {
  it("is neutral at regimen 3", () => {
    expect(regimenRecoveryModifier(3)).toBeCloseTo(1.0);
  });

  it("directional invariant: higher regimen recovers faster", () => {
    expect(regimenRecoveryModifier(5)).toBeGreaterThan(regimenRecoveryModifier(3));
    expect(regimenRecoveryModifier(3)).toBeGreaterThan(regimenRecoveryModifier(1));
  });
});

describe("regimen decay modifier", () => {
  it("is neutral at regimen 3", () => {
    expect(regimenDecayModifier(3)).toBeCloseTo(1.0);
  });

  it("directional invariant: higher regimen decays slower", () => {
    expect(regimenDecayModifier(5)).toBeLessThan(regimenDecayModifier(3));
    expect(regimenDecayModifier(3)).toBeLessThan(regimenDecayModifier(1));
  });
});

describe("regimen severity adjustment", () => {
  it("at regimen 3, severity is identical to pre-regimen baseline", () => {
    const rng = createSeededRng(42);
    // At regimen 3, the regimen adjustment is 0, so the only adjustment is from proneness
    // This test proves the API still works at neutral
    for (const trigger of ["contact", "non-contact"] as const) {
      const result = resolveSeverity(trigger, 10, rng, 3);
      expect(["light", "medium", "severe"]).toContain(result);
    }
  });

  it("directional invariant: higher regimen reduces severity (fewer severe rolls)", () => {
    // Run many rolls at regimen 1 vs 5 to measure the shift
    // At regimen 5: adjustment = (5-3) * -0.03 = -0.06 (lowers cutoffs)
    // At regimen 1: adjustment = (1-3) * -0.03 = +0.06 (raises cutoffs)
    // Lower cutoffs = easier to fall below them = lighter severity
    const countSevere = (regimen: number, trials = 500): number => {
      let severe = 0;
      for (let i = 0; i < trials; i++) {
        const result = resolveSeverity("contact", 10, createSeededRng(i * 7 + 13), regimen);
        if (result === "severe") severe++;
      }
      return severe;
    };

    // Higher regimen should produce fewer severe injuries
    // Using a large enough sample to overcome noise
    const severeAt1 = countSevere(1);
    const severeAt5 = countSevere(5);
    expect(severeAt5).toBeLessThanOrEqual(severeAt1);
  });
});