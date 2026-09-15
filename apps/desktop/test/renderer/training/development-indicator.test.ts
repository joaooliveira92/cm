import { describe, expect, it } from "vitest";
import { countDirections, describeLatestDevelopment } from "../../../src/renderer/training/developmentIndicator.js";

const change = (from: number, to: number) => ({ from, to });

describe("ticket 08 — the development indicator words the newest recorded Season, never inventing one", () => {
  it("says there is no comparison yet when no Season is recorded, rather than reading as zero", () => {
    expect(describeLatestDevelopment(null)).toBe(
      "No comparison yet: no Season has concluded with this player at your club.",
    );
  });

  it("says there is no comparison yet for the first recorded Season", () => {
    expect(describeLatestDevelopment({ seasonNumber: 1, comparedWithSeason: null, changes: [] })).toBe(
      "No comparison yet: Season 1 is the first recorded at your club.",
    );
  });

  it("distinguishes a compared Season with no change from one with no comparison", () => {
    expect(describeLatestDevelopment({ seasonNumber: 2, comparedWithSeason: 1, changes: [] })).toBe(
      "Season 2: no Attribute changed since Season 1.",
    );
  });

  it("counts rises and falls against the Season it was compared with, including a gap", () => {
    expect(
      describeLatestDevelopment({
        seasonNumber: 4,
        comparedWithSeason: 2,
        changes: [change(10, 12), change(11, 12), change(15, 14)],
      }),
    ).toBe("Season 4: 2 Attributes rose and 1 fell since Season 2.");
  });

  it("uses the singular and omits a direction with no changes", () => {
    expect(describeLatestDevelopment({ seasonNumber: 2, comparedWithSeason: 1, changes: [change(10, 11)] })).toBe(
      "Season 2: 1 Attribute rose since Season 1.",
    );
    expect(
      describeLatestDevelopment({ seasonNumber: 2, comparedWithSeason: 1, changes: [change(16, 15), change(14, 13)] }),
    ).toBe("Season 2: 2 Attributes fell since Season 1.");
  });

  it("counts only moved Attributes by direction", () => {
    expect(countDirections([change(1, 2), change(3, 2), change(5, 5)])).toEqual({ rose: 1, fell: 1 });
  });
});
