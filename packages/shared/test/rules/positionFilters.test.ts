import { describe, expect, it } from "vitest";
import type { Line, PositionalRatings, Side } from "../../src/rules/playerRatings/positionalRatings.js";
import { canPlayOf, positionFilterName, positionOrderOf, positionSummaryOf } from "../../src/rules/positionRules/positionFilters.js";

const ratings = (lines: Partial<Record<Line, number>>, sides: Partial<Record<Side, number>>): PositionalRatings => ({
  lines: { GK: 1, SW: 1, D: 1, DM: 1, M: 1, AM: 1, F: 1, WB: 1, ...lines },
  sides: { R: 1, L: 1, C: 1, ...sides },
  freeRole: 1,
});

describe("canPlayOf", () => {
  it("finds a wing-back at D R through his WB line, though his label shows no D", () => {
    const wingBack = ratings({ D: 10, WB: 18, M: 16 }, { R: 18 });
    expect(positionSummaryOf(wingBack).positionLabel).toBe("M R");
    expect(canPlayOf(wingBack)).toEqual(expect.arrayContaining(["D R", "DM R", "M R"]));
    expect(canPlayOf(wingBack)).not.toContain("D C");
  });

  it("matches exactly at 15 and not at 14", () => {
    expect(canPlayOf(ratings({ D: 15 }, { C: 15 }))).toContain("D C");
    expect(canPlayOf(ratings({ D: 15 }, { C: 14 }))).not.toContain("D C");
  });
});

describe("positionOrderOf", () => {
  it("sorts goalkeepers first and forwards last, then right before left before centre", () => {
    const keeper = positionOrderOf(ratings({ GK: 19 }, {}));
    const rightBack = positionOrderOf(ratings({ D: 19 }, { R: 19 }));
    const leftBack = positionOrderOf(ratings({ D: 19 }, { L: 19 }));
    const centreBack = positionOrderOf(ratings({ D: 19 }, { C: 19 }));
    const striker = positionOrderOf(ratings({ F: 19 }, { C: 19 }));
    const orders = [keeper, rightBack, leftBack, centreBack, striker];
    expect(orders).toEqual(orders.slice().sort((a, b) => a - b));
    expect(new Set(orders).size).toBe(5);
  });
});

it("names filters for a screen", () => {
  expect(positionFilterName("D R")).toBe("Defender (right)");
  expect(positionFilterName("GK")).toBe("Goalkeeper");
});
