import { describe, expect, it } from "vitest";
import { SQUAD_QUALITY_BANDS } from "@cm-clone/shared";
import { qualityPresentationOf } from "../../../src/renderer/clubSelection/club-profile.js";

const VARIANTS = ["default", "success", "warning", "destructive", "outline"];

/**
 * The panel's Squad Quality reading is keyed by the domain's bands. It once used a vocabulary no
 * real band matched, so every club fell through to an outline badge and a 0% meter.
 */
describe("the Squad Quality presentation", () => {
  it.each(SQUAD_QUALITY_BANDS)("configures %s with a badge and a non-zero meter", (band) => {
    const presentation = qualityPresentationOf(band);
    expect(VARIANTS).toContain(presentation.variant);
    expect(presentation.label.length).toBeGreaterThan(0);
    expect(presentation.percent).toBeGreaterThan(0);
    expect(presentation.percent).toBeLessThanOrEqual(100);
  });

  it("gives no real band the unconfigured outline fallback", () => {
    for (const band of SQUAD_QUALITY_BANDS) expect(qualityPresentationOf(band).variant).not.toBe("outline");
  });

  it("fills the meter in band order, from the weakest band up to Elite at 100%", () => {
    const percents = SQUAD_QUALITY_BANDS.map((band) => qualityPresentationOf(band).percent);
    expect([...percents].sort((a, b) => a - b)).toEqual(percents);
    expect(new Set(percents).size).toBe(percents.length);
    expect(qualityPresentationOf("Elite").percent).toBe(100);
  });
});
