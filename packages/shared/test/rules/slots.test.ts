import { describe, expect, it } from "vitest";
import type { PlayerAttributes } from "../../src/rules/positionRules/positions.js";
import { PHASE_POSITIONS, POSITIONS } from "../../src/rules/positionRules/positions.js";
import { positionRating } from "../../src/rules/playerRatings/ratings.js";
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
} from "../../src/rules/positionRules/slots.js";
import { positionRatingAt } from "../../src/rules/playerRatings/suitability.js";

const cell = (row: Slot["row"], column: Slot["column"]): Slot => ({ row, column }) as Slot;

const attributes = (overrides: Partial<PlayerAttributes> = {}): PlayerAttributes => ({
  passing: 10, shooting: 10, tackling: 10, dribbling: 10, heading: 10, crossing: 10, finishing: 10,
  firstTouch: 10, positioning: 10, decisions: 10, composure: 10, determination: 10, teamwork: 10,
  flair: 10, pace: 10, acceleration: 10, stamina: 10, strength: 10, agility: 10, naturalFitness: 10,
  bravery: 10, aggression: 10, injuryProneness: 10, ...overrides,
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
  it("puts each Position in the phase today's phase table gives it", () => {
    for (const [phase, positions] of Object.entries(PHASE_POSITIONS)) {
      for (const position of positions) {
        expect(phaseOfSlot(POSITION_SLOT[position])).toBe(phase);
      }
    }
    expect(Object.values(PHASE_POSITIONS).flat().sort()).toEqual([...POSITIONS].sort());
  });

  it("rates each Position exactly as its cell", () => {
    const player = attributes({ tackling: 17, crossing: 4, finishing: 15, gkHandling: 12 });
    for (const position of POSITIONS) {
      expect(positionRatingAt(player, POSITION_SLOT[position])).toBe(positionRating(player, position));
    }
  });
});
