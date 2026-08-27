import { describe, expect, it } from "vitest";
import { fatigueMultiplier } from "../../src/match/fatigue.js";

describe("fatigueMultiplier", () => {
  it("is 1 (no decay) before minute 60", () => {
    expect(fatigueMultiplier(59, 12, 1)).toBe(1);
  });

  it("decays after minute 60", () => {
    expect(fatigueMultiplier(85, 12, 1)).toBeLessThan(1);
  });

  it("decays less for a higher squad-average Stamina", () => {
    const lowStamina = fatigueMultiplier(85, 8, 1);
    const highStamina = fatigueMultiplier(85, 18, 1);
    expect(highStamina).toBeGreaterThan(lowStamina);
  });

  it("decays faster under a higher fatigueDecayMultiplier (High pressing)", () => {
    const normal = fatigueMultiplier(85, 12, 1);
    const highPressing = fatigueMultiplier(85, 12, 2);
    expect(highPressing).toBeLessThan(normal);
  });
});
