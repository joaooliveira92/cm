import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/rng.js";
import {
  START_CONDITION,
  conditionAfterDays,
  conditionDecayPerMinute,
  newConditionLedger,
} from "../../src/match/condition.js";
import { resolveSeverity, resolveType, rollInjury, tierForSeverity } from "../../src/match/injury.js";

describe("condition ledger", () => {
  it("starts every tracked player at START_CONDITION", () => {
    const ledger = newConditionLedger(["a", "b", "c"]);
    expect([...ledger.values()]).toEqual([START_CONDITION, START_CONDITION, START_CONDITION]);
  });

  it("decays faster for a low-Stamina player than a fit one", () => {
    const low = conditionDecayPerMinute(6, 1);
    const high = conditionDecayPerMinute(18, 1);
    expect(low).toBeGreaterThan(high);
  });

  it("decays faster under a high Tempo multiplier", () => {
    const slow = conditionDecayPerMinute(12, 0.8);
    const fast = conditionDecayPerMinute(12, 1.2);
    expect(fast).toBeGreaterThan(slow);
  });
it("seeds players at their carried-over startingCondition", () => {
    const ledger = newConditionLedger(
      ["a", "b"],
      [
        { id: "a", startingCondition: 60 },
        { id: "b" },
      ],
    );
    expect(ledger.get("a")).toBe(60);
    expect(ledger.get("b")).toBe(START_CONDITION);
  });

  it("recovers toward 100% faster with high Natural Fitness", () => {
    const fit = conditionAfterDays(60, 7, 18, "none");
    const unfit = conditionAfterDays(60, 7, 8, "none");
    expect(fit).toBeGreaterThan(unfit);
  });

  it("recovers a knock faster than a severe injury over the same days", () => {
    const knock = conditionAfterDays(45, 5, 12, "light");
    const severe = conditionAfterDays(45, 5, 12, "severe");
    expect(knock).toBeGreaterThan(severe);
  });

  it("a not-fully-recovered player stays below 100% after one rest week", () => {
    expect(conditionAfterDays(45, 7, 10, "medium")).toBeLessThan(START_CONDITION);
  });
});

describe("injury severity pipeline", () => {
  it("resolves a severity from every trigger", () => {
    for (const trigger of ["contact", "non-contact"] as const) {
      expect(["light", "medium", "severe"]).toContain(resolveSeverity(trigger, 10, createSeededRng(1)));
    }
  });

  it("maps severity to the orange/red tier", () => {
    expect(tierForSeverity("light")).toBe("orange");
    expect(tierForSeverity("medium")).toBe("orange");
    expect(tierForSeverity("severe")).toBe("red");
  });

  it("resolves a structural type for contact and muscular/fatigue type for non-contact", () => {
    const structural = ["brokenToe", "twistedAnkle", "deadLeg"];
    const muscular = ["hamstring", "calf", "strain"];
    expect(structural).toContain(resolveType("contact", createSeededRng(1)));
    expect(muscular).toContain(resolveType("non-contact", createSeededRng(1)));
  });

  it("rolls a full injury with severity, type, and tier together", () => {
    const injury = rollInjury("non-contact", 15, createSeededRng(2));
    expect(["light", "medium", "severe"]).toContain(injury.severity);
    expect(injury.tier).toBe(tierForSeverity(injury.severity));
    expect(injury.type).toBeTruthy();
  });

  it("is deterministic from the seed", () => {
    const a = rollInjury("contact", 12, createSeededRng(5));
    const b = rollInjury("contact", 12, createSeededRng(5));
    expect(a).toEqual(b);
  });
});