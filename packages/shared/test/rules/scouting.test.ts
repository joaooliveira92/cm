import { describe, expect, it } from "vitest";
import { transferValue } from "../../src/rules/ratings.js";
import { weeklyWage } from "../../src/rules/transfers.js";
import {
  FULLY_SCOUTED,
  attributeRange,
  figureByProgress,
  progressForReading,
  transferValueFigureByProgress,
  wageFigureByProgress,
  wageIsWithinFigure,
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

describe("progressForReading", () => {
  it("reads the manager's own Players at full knowledge whatever the ledger says", () => {
    expect(progressForReading("club_eng_01", "club_eng_01", 0)).toBe(FULLY_SCOUTED);
    expect(progressForReading("club_eng_01", "club_eng_01", 40)).toBe(FULLY_SCOUTED);
  });

  it("reads every other Player by the recorded progress, and a Free Agent by it too", () => {
    expect(progressForReading("club_eng_02", "club_eng_01", 40)).toBe(40);
    expect(progressForReading(null, "club_eng_01", 40)).toBe(40);
    // Absent row: the caller passes the 0 default, and 0 is the widest honest band.
    expect(progressForReading(null, "club_eng_01", 0)).toBe(0);
  });
});

describe("wageFigureByProgress", () => {
  it("publishes the true weekly wage as exact at Fully Scouted", () => {
    expect(wageFigureByProgress(78, 24, 90, FULLY_SCOUTED)).toEqual({
      _tag: "exact",
      value: weeklyWage(78, 24, 90),
    });
  });

  it("publishes the Rating band propagated through the wage formula below Fully Scouted", () => {
    const figure = wageFigureByProgress(78, 24, 90, 0);
    expect(figure._tag).toBe("range");
    if (figure._tag === "range") {
      expect(figure.low).toBe(weeklyWage(attributeRange(78, 0)[0]!, 24, 90));
      expect(figure.high).toBe(weeklyWage(attributeRange(78, 0)[1]!, 24, 90));
      const trueWage = weeklyWage(78, 24, 90);
      expect(figure.low).toBeLessThanOrEqual(trueWage);
      expect(figure.high).toBeGreaterThanOrEqual(trueWage);
    }
  });

  it("the wage band narrows with progress and never withholds the true wage", () => {
    const trueWage = weeklyWage(45, 33, 60);
    let previousWidth: number | null = null;
    for (let progress = 0; progress < FULLY_SCOUTED; progress += 1) {
      const figure = wageFigureByProgress(45, 33, 60, progress);
      expect(figure._tag).toBe("range");
      if (figure._tag === "range") {
        expect(figure.low).toBeLessThanOrEqual(trueWage);
        expect(figure.high).toBeGreaterThanOrEqual(trueWage);
        const width = figure.high - figure.low;
        if (previousWidth !== null) expect(width).toBeLessThanOrEqual(previousWidth);
        previousWidth = width;
      }
    }
  });

  it("an unscouted band is wider than a fixed band would be, because it prices the Rating band", () => {
    // The point of running the Rating band through the formula rather than a fixed percentage off
    // the true wage: a high-rated player's wage uncertainty is larger than a flat band would say.
    const band = wageFigureByProgress(85, 27, 95, 0);
    const flat = figureByProgress(weeklyWage(85, 27, 95), 0, [1, Number.MAX_SAFE_INTEGER]);
    if (band._tag === "range" && flat._tag === "range") {
      expect(band.high - band.low).toBeGreaterThan(flat.high - flat.low);
    } else {
      expect.unreachable();
    }
  });
});

describe("wageIsWithinFigure", () => {
  it("accepts only the exact wage at Fully Scouted", () => {
    const figure = { _tag: "exact", value: 2_100 } as const;
    expect(wageIsWithinFigure(2_100, figure)).toBe(true);
    expect(wageIsWithinFigure(2_099, figure)).toBe(false);
    expect(wageIsWithinFigure(2_101, figure)).toBe(false);
  });

  it("accepts any whole number of Credits inside a band, and nothing outside it", () => {
    const band = { _tag: "range", low: 900, high: 3_400 } as const;
    expect(wageIsWithinFigure(900, band)).toBe(true);
    expect(wageIsWithinFigure(3_400, band)).toBe(true);
    expect(wageIsWithinFigure(2_000, band)).toBe(true);
    expect(wageIsWithinFigure(899, band)).toBe(false);
    expect(wageIsWithinFigure(3_401, band)).toBe(false);
  });

  it("refuses a wage that is not a whole positive number of Credits", () => {
    const band = { _tag: "range", low: 900, high: 3_400 } as const;
    for (const bad of [0, -1, 1_000.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(wageIsWithinFigure(bad, band)).toBe(false);
    }
  });
});
