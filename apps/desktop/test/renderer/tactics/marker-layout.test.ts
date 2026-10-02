import { describe, expect, it } from "vitest";
import type { SquadPlayerView } from "@cm-clone/contracts";
import type { Slot } from "@cm-clone/shared";
import {
  captionShift,
  captionShiftIn,
  fitTierWord,
  markerBox,
  markerName,
} from "../../../src/renderer/tactics/markerLayout.js";

const player = (over: Partial<SquadPlayerView> = {}): SquadPlayerView =>
  ({ firstName: "Alessandro", lastName: "Gilardino", suitability: {}, ...over }) as SquadPlayerView;

describe("markerBox — where a marker sits, in percent of the pitch", () => {
  it("puts the disc on the spot and the caption under it", () => {
    expect(markerBox(89, 41)).toEqual({
      left: "89%",
      top: "calc(41% - 0.875rem)",
      width: "min(6rem, 19cqw)",
    });
  });

  it("holds the marker's width steady at any spot, so neighbours' captions line up in columns", () => {
    expect(markerBox(11, 69).width).toBe(markerBox(89, 69).width);
  });
});

describe("captionShiftIn — a caption pulled back onto the pitch", () => {
  /** The widest the caption ever is: 19cqw, half of it is 9.5 percent of the pitch width. */
  const HALF = 9.5;

  it("leaves a caption that fits where it stands alone", () => {
    expect(captionShiftIn(50, HALF)).toBe(0);
    expect(captionShiftIn(HALF, HALF)).toBe(0);
    expect(captionShiftIn(100 - HALF, HALF)).toBe(0);
  });

  it("pulls it back by the overhang past either touchline", () => {
    expect(captionShiftIn(4, HALF)).toBeCloseTo(HALF - 4, 5);
    expect(captionShiftIn(96, HALF)).toBeCloseTo(4 - HALF, 5);
  });

  it("keeps the whole caption on the pitch, wherever the marker stands", () => {
    for (let x = -5; x <= 105; x += 0.5) {
      const left = x - HALF + captionShiftIn(x, HALF);
      const right = x + HALF + captionShiftIn(x, HALF);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(100);
    }
  });
});

describe("captionShift — the same clamp as the browser evaluates it", () => {
  it("measures the caption's half-width in container-query units, which JS cannot read", () => {
    const shift = captionShift(11);
    expect(shift).toContain("translateX(");
    expect(shift).toContain("(min(6rem, 19cqw) / 2) - 11cqw");
    expect(shift).toContain("min(0px, calc(89cqw - (min(6rem, 19cqw) / 2)))");
  });
});

describe("a marker's caption", () => {
  it("names the player short, since the full name is in the Team Selection list beside it", () => {
    expect(markerName(player())).toBe("Gilardino, A");
    expect(markerName(player({ firstName: "Xherdan", lastName: "Shaqiri" }))).toBe("Shaqiri, X");
  });

  it("gives the fit as a word, never a colour", () => {
    const cell = { row: "AM", column: "C" } as Slot;
    expect(fitTierWord(player({ suitability: { "AM C": 20 } }), cell)).toBe("Natural");
    expect(fitTierWord(player({ suitability: { "AM C": 16 } }), cell)).toBe("Competent");
    expect(fitTierWord(player({ suitability: { "AM C": 10 } }), cell)).toBe("Unfamiliar");
  });

  it("reads a cell the player has no suitability for as unfamiliar", () => {
    expect(fitTierWord(player({ suitability: { "AM C": 20 } }), { row: "D", column: "L" } as Slot)).toBe(
      "Unfamiliar",
    );
  });
});
