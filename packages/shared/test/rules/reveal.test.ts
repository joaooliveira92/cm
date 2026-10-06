import { describe, expect, it } from "vitest";
import { revealedAt, revealedCut } from "../../src/rules/reveal.js";

const items = ["a", "b", "c"];

describe("the revealed-position cut law", () => {
  it("includes everything for the whole match (null)", () => {
    expect(revealedCut(items, null)).toBe(3);
    expect(revealedAt(items, null)).toEqual(items);
  });

  it("cuts at a position", () => {
    expect(revealedCut(items, 2)).toBe(2);
    expect(revealedAt(items, 2)).toEqual(["a", "b"]);
  });

  it("clamps an over-long position to the last real item rather than indexing past it", () => {
    expect(revealedCut(items, 9)).toBe(3);
    expect(revealedAt(items, 9)).toEqual(items);
  });

  it("clamps a negative position to none", () => {
    expect(revealedCut(items, -1)).toBe(0);
    expect(revealedAt(items, -1)).toEqual([]);
  });
});
