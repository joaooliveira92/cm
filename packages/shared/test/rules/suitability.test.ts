import { describe, expect, it } from "vitest";
import type { PlayerAttributes } from "../../src/rules/positionRules/positions.js";
import type { Line, PositionalRatings, Side } from "../../src/rules/playerRatings/positionalRatings.js";
import type { Slot } from "../../src/rules/positionRules/slots.js";
import {
  familiarityOf,
  fitRatingAt,
  suitabilityFactor,
  overallRatingOverCells,
  positionRatingAt,
  suitability,
} from "../../src/rules/playerRatings/suitability.js";

/** Ratings with every line and side at 1 unless overridden. */
const ratings = (
  lines: Partial<Record<Line, number>> = {},
  sides: Partial<Record<Side, number>> = {},
  freeRole = 1,
): PositionalRatings => ({
  lines: { GK: 1, SW: 1, D: 1, DM: 1, M: 1, AM: 1, F: 1, WB: 1, ...lines },
  sides: { R: 1, L: 1, C: 1, ...sides },
  freeRole,
});

const cell = (row: Slot["row"], column: Slot["column"]): Slot => ({ row, column }) as Slot;

const attributes = (overrides: Partial<PlayerAttributes> = {}): PlayerAttributes => ({
  passing: 10, shooting: 10, tackling: 10, dribbling: 10, heading: 10, crossing: 10, finishing: 10,
  firstTouch: 10, positioning: 10, decisions: 10, composure: 10, determination: 10, teamwork: 10,
  flair: 10, pace: 10, acceleration: 10, stamina: 10, strength: 10, agility: 10, naturalFitness: 10,
  bravery: 10, aggression: 10, injuryProneness: 10, ...overrides,
});

describe("suitability", () => {
  it("is the lower of the row's line and the column's side", () => {
    const rightBack = ratings({ D: 19 }, { R: 17 });
    expect(suitability(rightBack, cell("D", "R"))).toBe(17);
    expect(suitability(ratings({ D: 12 }, { R: 20 }), cell("D", "R"))).toBe(12);
  });

  it("never lets a strong line hide a missing side", () => {
    expect(suitability(ratings({ D: 20 }, { R: 20 }), cell("D", "L"))).toBe(1);
  });

  it("reads the Centre side for LC, C and RC", () => {
    const centreBack = ratings({ D: 20 }, { C: 18 });
    for (const column of ["LC", "C", "RC"] as const) {
      expect(suitability(centreBack, cell("D", column))).toBe(18);
    }
    expect(suitability(centreBack, cell("D", "L"))).toBe(1);
  });

  it("rates wide D and DM cells against the better of the line and Wing Back", () => {
    const wingBack = ratings({ D: 12, DM: 10, WB: 19 }, { L: 18 });
    expect(suitability(wingBack, cell("D", "L"))).toBe(18);
    expect(suitability(wingBack, cell("DM", "L"))).toBe(18);
  });

  it("does not let Wing Back help central D and DM cells", () => {
    const wingBack = ratings({ D: 12, DM: 10, WB: 20 }, { C: 20 });
    expect(suitability(wingBack, cell("D", "C"))).toBe(12);
    expect(suitability(wingBack, cell("DM", "C"))).toBe(10);
  });

  it("rates M cells against the better of M and AM − 5", () => {
    expect(suitability(ratings({ M: 8, AM: 20 }, { C: 20 }), cell("M", "C"))).toBe(15);
    expect(suitability(ratings({ M: 17, AM: 20 }, { C: 20 }), cell("M", "C"))).toBe(17);
  });

  it("does not apply the AM − 5 rule outside the M row", () => {
    expect(suitability(ratings({ AM: 20, F: 3 }, { C: 20 }), cell("F", "C"))).toBe(3);
  });

  it("reads only the GK line for the goalkeeper cell", () => {
    expect(suitability(ratings({ GK: 19 }, { R: 1, L: 1, C: 1 }), cell("GK", "C"))).toBe(19);
  });
});

describe("familiarityOf", () => {
  it.each([
    [20, "natural"],
    [18, "natural"],
    [17, "competent"],
    [15, "competent"],
    [14, "unfamiliar"],
    [1, "unfamiliar"],
  ] as const)("suitability %i is %s", (value, tier) => {
    expect(familiarityOf(value)).toBe(tier);
  });
});

describe("overallRatingOverCells", () => {
  it("is the best Position Rating among Natural cells, not the first", () => {
    const player = attributes({ tackling: 4, heading: 4, finishing: 20, shooting: 20, composure: 18 });
    const centreBackAndStriker = ratings({ D: 19, F: 19 }, { C: 19 });
    const striker = positionRatingAt(player, cell("F", "C"));
    expect(striker).toBeGreaterThan(positionRatingAt(player, cell("D", "C")));
    expect(overallRatingOverCells(player, centreBackAndStriker)).toBe(striker);
  });

  it("ignores cells he is only competent in", () => {
    const player = attributes({ finishing: 20, shooting: 20, tackling: 5 });
    const centreBackCompetentStriker = ratings({ D: 19, F: 16 }, { C: 19 });
    expect(overallRatingOverCells(player, centreBackCompetentStriker)).toBe(positionRatingAt(player, cell("D", "C")));
  });

  it("falls back to his most suitable cells when he is natural nowhere", () => {
    const player = attributes();
    const utility = ratings({ M: 16 }, { R: 16 });
    expect(overallRatingOverCells(player, utility)).toBe(positionRatingAt(player, cell("M", "R")));
  });
});

describe("suitabilityFactor", () => {
  it("is 1.0 at 20, 0.9 at 15 and 0.5 at 1, and never rises as suitability falls", () => {
    expect(suitabilityFactor(20)).toBeCloseTo(1);
    expect(suitabilityFactor(15)).toBeCloseTo(0.9);
    expect(suitabilityFactor(1)).toBeCloseTo(0.5);
    for (let value = 2; value <= 20; value += 1) {
      expect(suitabilityFactor(value)).toBeGreaterThan(suitabilityFactor(value - 1));
    }
  });

  it("falls faster below 15 than above it", () => {
    expect(suitabilityFactor(15) - suitabilityFactor(10)).toBeGreaterThan(suitabilityFactor(20) - suitabilityFactor(15));
  });
});

describe("fitRatingAt", () => {
  it("rates a natural full-back above a better-attributed player who cannot play the flank", () => {
    const rightBack = ratings({ D: 19 }, { R: 19 });
    const centreBack = ratings({ D: 19 }, { C: 19 });
    const modest = attributes({ tackling: 12, pace: 12, crossing: 12, positioning: 12, stamina: 12 });
    const strong = attributes({ tackling: 16, pace: 16, crossing: 16, positioning: 16, stamina: 16 });
    expect(fitRatingAt(modest, rightBack, cell("D", "R"))).toBeGreaterThan(fitRatingAt(strong, centreBack, cell("D", "R")));
  });
});
