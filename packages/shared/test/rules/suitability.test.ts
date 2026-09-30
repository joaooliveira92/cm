import { describe, expect, it } from "vitest";
import type { PlayerAttributes, Position } from "../../src/rules/positions.js";
import { POSITIONS } from "../../src/rules/positions.js";
import type { Line, PositionalRatings, Side } from "../../src/rules/positionalRatings.js";
import { positionRating } from "../../src/rules/ratings.js";
import {
  COLUMNS,
  PHASE_OF_ROW,
  POSITION_SLOT,
  ROWS,
  SLOTS,
  SLOT_WEIGHTS,
  WEIGHT_TABLES,
  compareSlots,
  phaseOfSlot,
  slotLabel,
  weightTableOf,
  type Slot,
} from "../../src/rules/slots.js";
import {
  familiarityOf,
  overallRatingAt,
  positionRatingAt,
  suitability,
} from "../../src/rules/suitability.js";

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

const cell = (row: Slot["row"], column: Slot["column"]): Slot => ({ row, column });

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

describe("slots", () => {
  it("has the goalkeeper cell plus six rows of five columns", () => {
    expect(SLOTS).toHaveLength(31);
    expect(new Set(SLOTS.map((slot) => slotLabel(slot))).size).toBe(31);
  });

  it("labels cells as CM does", () => {
    expect(slotLabel(cell("GK", "C"))).toBe("GK");
    expect(slotLabel(cell("D", "RC"))).toBe("D RC");
    expect(slotLabel(cell("AM", "L"))).toBe("AM L");
  });

  it("sorts in pitch order: goalkeeper first, then by row, then left to right", () => {
    const shuffled = [cell("F", "C"), cell("D", "R"), cell("GK", "C"), cell("D", "L"), cell("SW", "C")];
    expect([...shuffled].sort(compareSlots).map((slot) => slotLabel(slot))).toEqual([
      "GK",
      "SW C",
      "D L",
      "D R",
      "F C",
    ]);
  });

  it("resolves every cell to exactly one weights table and one phase", () => {
    for (const slot of SLOTS) {
      expect(WEIGHT_TABLES).toContain(weightTableOf(slot));
      expect(["defense", "midfield", "attack"]).toContain(phaseOfSlot(slot));
    }
    expect(new Set(SLOTS.map((slot) => weightTableOf(slot))).size).toBe(12);
  });

  it("keeps phase by row in step with the rows", () => {
    expect(Object.keys(PHASE_OF_ROW).sort()).toEqual([...ROWS].sort());
    expect(COLUMNS).toEqual(["L", "LC", "C", "RC", "R"]);
  });

  it("leaves bravery, aggression and the fitness and injury attributes out of every table", () => {
    for (const table of Object.values(SLOT_WEIGHTS)) {
      for (const excluded of ["bravery", "aggression", "naturalFitness", "injuryProneness"]) {
        expect(table).not.toHaveProperty(excluded);
      }
    }
  });
});

describe("the transitional Position mapping", () => {
  it("puts each Position in the phase it fed before", () => {
    const before: Record<Position, string> = {
      GK: "defense", DC: "defense", DL: "defense", DR: "defense",
      DM: "midfield", MC: "midfield", ML: "midfield", MR: "midfield",
      AMC: "attack", ST: "attack",
    };
    for (const position of POSITIONS) {
      expect(phaseOfSlot(POSITION_SLOT[position])).toBe(before[position]);
    }
  });

  it("rates each Position exactly as its cell", () => {
    const player = attributes({ tackling: 17, crossing: 4, finishing: 15, gkHandling: 12 });
    for (const position of POSITIONS) {
      expect(positionRatingAt(player, POSITION_SLOT[position])).toBe(positionRating(player, position));
    }
  });
});

describe("overallRatingAt", () => {
  it("is the best Position Rating among Natural cells", () => {
    const player = attributes({ tackling: 18, heading: 18, positioning: 16, finishing: 20, shooting: 20 });
    const centreBackOnly = ratings({ D: 19 }, { C: 19 });
    expect(overallRatingAt(player, centreBackOnly)).toBe(positionRatingAt(player, cell("D", "C")));
  });

  it("ignores cells he is only competent in", () => {
    const player = attributes({ finishing: 20, shooting: 20, tackling: 5 });
    const centreBackCompetentStriker = ratings({ D: 19, F: 16 }, { C: 19 });
    expect(overallRatingAt(player, centreBackCompetentStriker)).toBe(positionRatingAt(player, cell("D", "C")));
  });

  it("falls back to his most suitable cells when he is natural nowhere", () => {
    const player = attributes();
    const utility = ratings({ M: 16 }, { R: 16 });
    expect(overallRatingAt(player, utility)).toBe(positionRatingAt(player, cell("M", "R")));
  });
});
