import { describe, expect, it } from "vitest";
import { transferValue } from "../../src/rules/ratings.js";
import {
  FULLY_SCOUTED,
  attributeRange,
  figureByProgress,
  transferValueFigureByProgress,
} from "../../src/rules/scouting.js";

describe("figureByProgress", () => {
  it("publishes a Range below Fully Scouted and the exact value at Fully Scouted", () => {
    expect(figureByProgress(78, 0)).toEqual({ _tag: "range", low: 58, high: 98 });
    expect(figureByProgress(78, FULLY_SCOUTED)).toEqual({ _tag: "exact", value: 78 });
  });

  it("narrows monotonically as progress rises and never widens", () => {
    const lows: number[] = [];
    const highs: number[] = [];
    for (let progress = 0; progress < FULLY_SCOUTED; progress += 1) {
      const figure = figureByProgress(78, progress);
      expect(figure._tag).toBe("range");
      if (figure._tag === "range") {
        lows.push(figure.low);
        highs.push(figure.high);
      }
    }
    for (let i = 1; i < lows.length; i += 1) {
      expect(lows[i]!).toBeGreaterThanOrEqual(lows[i - 1]!);
      expect(highs[i]!).toBeLessThanOrEqual(highs[i - 1]!);
    }
  });

  it("collapses to the exact value at progress 100 and only at 100", () => {
    // At 99 the band has rounded to nothing, but the player is not yet Fully Scouted, so the cell
    // still reads as the tightest Range rather than an exact number.
    expect(figureByProgress(78, 99)).toEqual({ _tag: "range", low: 78, high: 78 });
    expect(figureByProgress(78, 100)).toEqual({ _tag: "exact", value: 78 });
  });

  it("clamps to the display scale, never leaking a Rating outside 1-100", () => {
    expect(figureByProgress(95, 0)).toEqual({ _tag: "range", low: 75, high: 100 });
    expect(figureByProgress(3, 0)).toEqual({ _tag: "range", low: 1, high: 23 });
  });
});

describe("transferValueFigureByProgress", () => {
  it("publishes the true Transfer Value as exact at Fully Scouted", () => {
    expect(transferValueFigureByProgress(78, 24, 90, FULLY_SCOUTED)).toEqual({
      _tag: "exact",
      value: transferValue(78, 24, 90),
    });
  });

  it("publishes the Rating band propagated through the value formula below Fully Scouted", () => {
    const figure = transferValueFigureByProgress(78, 24, 90, 0);
    expect(figure._tag).toBe("range");
    if (figure._tag === "range") {
      expect(figure.low).toBe(transferValue(attributeRange(78, 0)[0]!, 24, 90));
      expect(figure.high).toBe(transferValue(attributeRange(78, 0)[1]!, 24, 90));
      const trueValue = transferValue(78, 24, 90);
      expect(figure.low).toBeLessThan(trueValue);
      expect(figure.high).toBeGreaterThan(trueValue);
    }
  });

  it("the Value band narrows with progress and always contains the true value", () => {
    const trueValue = transferValue(45, 33, 60);
    let previousWidth: number | null = null;
    for (let progress = 0; progress < FULLY_SCOUTED; progress += 1) {
      const figure = transferValueFigureByProgress(45, 33, 60, progress);
      expect(figure._tag).toBe("range");
      if (figure._tag === "range") {
        expect(figure.low).toBeLessThanOrEqual(trueValue);
        expect(figure.high).toBeGreaterThanOrEqual(trueValue);
        const width = figure.high - figure.low;
        if (previousWidth !== null) expect(width).toBeLessThanOrEqual(previousWidth);
        previousWidth = width;
      }
    }
  });
});