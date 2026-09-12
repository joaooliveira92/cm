import { describe, expect, it } from "vitest";
import {
  familiarityTierCounts,
  partitionSelection,
} from "../../src/rules/tacticsSummary.js";

describe("partitionSelection", () => {
  const squad = ["p1", "p2", "p3", "p4", "p5"];

  it("names the slot players starters in slot order and the bench players substitutes in bench order", () => {
    const { starters, substitutes } = partitionSelection(
      squad,
      ["p3", "p1", "p5"],
      ["p2", "p4"],
    );
    expect(starters).toEqual(["p3", "p1", "p5"]);
    expect(substitutes).toEqual(["p2", "p4"]);
  });

  it("keeps starters and substitutes disjoint and inside the squad — the match-day eighteen", () => {
    for (const [slots, bench] of [
      [[], []],
      [["p1"], ["p2"]],
      [["p5", "p3", "p2", "p4", "p1"], []],
      [["p2", "p2", "p1"], ["p2", "p3", "breadcrumb"]],
    ] as const) {
      const { starters, substitutes } = partitionSelection(squad, slots, bench);
      const selected = new Set([...starters, ...substitutes]);
      for (const id of selected) {
        expect(squad).toContain(id);
      }
      expect(starters.some((id) => substitutes.includes(id))).toBe(false);
    }
  });

  it("never double-counts a bench player who also starts", () => {
    const { starters, substitutes } = partitionSelection(squad, ["p1", "p2"], ["p2", "p4"]);
    expect(starters).toEqual(["p1", "p2"]);
    expect(substitutes).toEqual(["p4"]);
  });

  it("excludes players who have left the squad from both lists, and empty bench slots contribute nothing", () => {
    const { starters, substitutes } = partitionSelection(squad, ["p1", "gone", "p3"], ["p4", "gone"]);
    expect(starters).toEqual(["p1", "p3"]);
    expect(substitutes).toEqual(["p4"]);
  });

  it("returns empty lists for an empty squad", () => {
    const { starters, substitutes } = partitionSelection([], ["p1"], ["p2"]);
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