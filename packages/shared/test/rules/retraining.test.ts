import { describe, expect, it } from "vitest";
import type { PositionalRatings } from "../../src/rules/positionalRatings.js";
import { applyRetraining, ratingOf, retrainingGain } from "../../src/rules/retraining.js";

const winger: PositionalRatings = {
  lines: { GK: 1, SW: 1, D: 6, DM: 4, M: 18, AM: 16, F: 5, WB: 9 },
  sides: { R: 19, L: 7, C: 5 },
  freeRole: 6,
};

describe("applyRetraining", () => {
  it("banks fractional progress and raises only the target rating by whole points", () => {
    let state = { ratings: winger, progress: 0 };
    for (let microcycle = 0; microcycle < 8; microcycle += 1) state = applyRetraining(state.ratings, "WB", state.progress, 0.3);
    expect(ratingOf(state.ratings, "WB")).toBe(11);
    expect(state.progress).toBeCloseTo(0.4);
    expect({ ...state.ratings, lines: { ...state.ratings.lines, WB: 9 } }).toEqual(winger);
  });

  it("retrains a side as well as a line", () => {
    const { ratings } = applyRetraining(winger, "L", 0.9, 0.2);
    expect(ratings.sides.L).toBe(8);
    expect(ratings.sides.R).toBe(19);
  });

  it("stops at 20 and banks nothing past it", () => {
    const { ratings, progress } = applyRetraining(winger, "R", 0.5, 3);
    expect(ratings.sides.R).toBe(20);
    expect(progress).toBe(0);
  });
});

describe("retrainingGain", () => {
  it("is faster for younger and more determined players", () => {
    expect(retrainingGain(19, 15)).toBeGreaterThan(retrainingGain(31, 15));
    expect(retrainingGain(24, 18)).toBeGreaterThan(retrainingGain(24, 6));
  });

  it("takes most of a season (about 40 Microcycles) to turn an average player's 9 into a 15", () => {
    const microcycles = Math.ceil(6 / retrainingGain(26, 10));
    expect(microcycles).toBeGreaterThan(15);
    expect(microcycles).toBeLessThan(40);
  });
});
