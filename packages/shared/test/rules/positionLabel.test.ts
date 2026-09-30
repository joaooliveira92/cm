import { describe, expect, it } from "vitest";
import { compactPositionLabel } from "../../src/rules/positionLabel.js";
import type { Line, PositionalRatings, Side } from "../../src/rules/positionalRatings.js";

const ratings = (
  lines: Partial<Record<Line, number>>,
  sides: Partial<Record<Side, number>>,
  freeRole = 1,
): PositionalRatings => ({
  lines: { GK: 1, SW: 1, D: 1, DM: 1, M: 1, AM: 1, F: 1, WB: 1, ...lines },
  sides: { R: 1, L: 1, C: 1, ...sides },
  freeRole,
});

/**
 * Worked examples. Labels marked "CM 03/04" appear in the transcribed in-game labels of the
 * research (docs/research/player-positional-model-cm0304-positional-fields.md); the rest exercise
 * one rule each.
 */
describe("compactPositionLabel", () => {
  it.each<[string, PositionalRatings, string]>([
    ["a centre-back on the right and centre (CM 03/04)", ratings({ D: 19 }, { R: 16, C: 18 }), "D RC"],
    ["a defender who also plays DM (CM 03/04)", ratings({ D: 18, DM: 16 }, { R: 15, C: 19 }), "D/DM RC"],
    ["an attacking midfielder and forward (CM 03/04)", ratings({ M: 15, AM: 18, F: 17 }, { R: 16, C: 18 }), "AM/F RC"],
    ["an attacking midfielder on every side (CM 03/04)", ratings({ AM: 19 }, { R: 17, L: 16, C: 18 }), "AM RLC"],
    ["a forward on the right is F", ratings({ F: 18 }, { R: 17, C: 16 }), "F RC"],
    ["no qualifying line gives an empty label", ratings({ D: 12 }, { R: 18 }), ""],
    ["a wide forward (CM 03/04)", ratings({ F: 18 }, { L: 17, C: 16 }), "F LC"],
    ["a sweeper who is also a centre-back (CM 03/04)", ratings({ SW: 17, D: 19 }, { C: 19 }), "SW/D C"],
    ["an out-and-out striker is S (CM 03/04)", ratings({ F: 19 }, { C: 19 }), "S C"],
    ["a central forward with a high Free Role is F (CM 03/04)", ratings({ F: 19 }, { C: 19 }, 16), "F C"],
    ["a goalkeeper is plain GK whatever else he rates", ratings({ GK: 17, D: 16 }, { C: 18 }), "GK"],
    ["M hides when DM qualifies (DM 17, M 20)", ratings({ DM: 17, M: 20 }, { C: 18 }), "DM C"],
    ["M hides when AM qualifies", ratings({ M: 18, AM: 16 }, { R: 17 }), "AM R"],
    ["AM hides when DM qualifies", ratings({ DM: 16, AM: 18 }, { C: 18 }), "DM C"],
    ["AM hides next to F unless M also qualifies", ratings({ AM: 17, F: 18 }, { C: 18 }), "F C"],
    ["Wing Back never appears", ratings({ D: 16, WB: 20 }, { L: 18 }), "D L"],
    ["sides keep R, L, C order", ratings({ M: 18 }, { R: 16, L: 16 }), "M RL"],
    ["a player with no qualifying side shows lines only", ratings({ D: 18 }, { R: 12 }), "D"],
    ["the threshold is 15, not 14", ratings({ D: 14, M: 15 }, { C: 14, R: 15 }), "M R"],
  ])("%s", (_description, input, expected) => {
    expect(compactPositionLabel(input)).toBe(expected);
  });
});
