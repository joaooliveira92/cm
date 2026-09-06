import { describe, expect, it } from "vitest";
import {
  familiarityTierCounts,
  partitionSelection,
} from "../../src/rules/tacticsSummary.js";

describe("partitionSelection", () => {
  const squad = ["p1", "p2", "p3", "p4", "p5"];

  it("names the slot players starters in slot order and everyone else substitutes", () => {
    const { starters, substitutes } = partitionSelection(squad, ["p3", "p1", "p5"]);
    expect(starters).toEqual(["p3", "p1", "p5"]);
    expect(substitutes).toEqual(["p2", "p4"]);
  });

  it("keeps starters and substitutes a partition of the squad — no overlap, nothing missing", () => {
    for (const slots of [
      [],
      ["p1"],
      ["p5", "p3", "p2", "p4", "p1"],
      ["p2", "p2", "p1"],
    ]) {
      const { starters, substitutes } = partitionSelection(squad, slots);
      expect(new Set([...starters, ...substitutes])).toEqual(new Set(squad));
      expect(starters.some((id) => substitutes.includes(id))).toBe(false);
    }
  });

  it("excludes slot players who have left the squad from both lists", () => {
    const { starters, substitutes } = partitionSelection(squad, ["p1", "gone", "p3"]);
    expect(starters).toEqual(["p1", "p3"]);
    expect(substitutes).toEqual(["p2", "p4", "p5"]);
  });

  it("returns an empty squad partition for an empty squad", () => {
    const { starters, substitutes } = partitionSelection([], ["p1"]);
    expect(starters).toEqual([]);
    expect(substitutes).toEqual([]);
  });
});

describe("familiarityTierCounts", () => {
  it("counts the three tiers and folds unfamiliar as the rest", () => {
    expect(
      familiarityTierCounts(["natural", "competent", "natural", "unfamiliar", "natural"]),
    ).toEqual({ natural: 3, competent: 1, unfamiliar: 1 });
  });

  it("an empty list is all zeros", () => {
    expect(familiarityTierCounts([])).toEqual({ natural: 0, competent: 0, unfamiliar: 0 });
  });

  it("counts a full eleven", () => {
    const allNatural = Array.from({ length: 11 }, () => "natural" as const);
    expect(familiarityTierCounts(allNatural)).toEqual({ natural: 11, competent: 0, unfamiliar: 0 });
  });
});