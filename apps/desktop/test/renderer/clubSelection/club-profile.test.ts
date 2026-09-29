import { describe, expect, it } from "vitest";
import { SQUAD_QUALITY_BANDS } from "@cm-clone/shared";
import { qualityVariantOf } from "../../../src/renderer/clubSelection/club-profile.js";
import { QUALITY_SEGMENTS, filledSegments } from "../../../src/renderer/clubSelection/model.js";

const VARIANTS = ["default", "success", "warning", "destructive"];

/**
 * The panel's Squad Quality reading is keyed by the domain's bands. It once used a vocabulary no
 * real band matched, so every club fell through to an outline badge and an empty meter.
 */
describe("the Squad Quality presentation", () => {
  it.each(SQUAD_QUALITY_BANDS)("colours %s and fills at least one meter segment", (band) => {
    expect(VARIANTS).toContain(qualityVariantOf(band));
    expect(filledSegments(band)).toBeGreaterThan(0);
  });

  it("fills the meter in band order, from one segment up to all of them for Elite", () => {
    expect(SQUAD_QUALITY_BANDS.map(filledSegments)).toEqual(
      Array.from({ length: QUALITY_SEGMENTS }, (_, index) => index + 1),
    );
    expect(filledSegments("Elite")).toBe(QUALITY_SEGMENTS);
  });
});
