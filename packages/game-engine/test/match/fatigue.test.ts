import { describe, expect, it } from "vitest";
import { fatigueMultiplier } from "../../src/match/fatigue.js";

describe("fatigueMultiplier", () => {
  it("is 1 (no decay) before minute 60", () => {
    expect(fatigueMultiplier(59, 12)).toBe(1);
  });

  it("decays after minute 60", () => {
    expect(fatigueMultiplier(85, 12)).toBeLessThan(1);
  });

  it("decays less for a higher squad-average Stamina", () => {
    const lowStamina = fatigueMultiplier(85, 8);
    const highStamina = fatigueMultiplier(85, 18);
    expect(highStamina).toBeGreaterThan(lowStamina);
  });

  it("decays further the later the minute", () => {
    expect(fatigueMultiplier(90, 12)).toBeLessThan(fatigueMultiplier(75, 12));
  });
});
