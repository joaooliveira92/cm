import type { SquadQualityBand } from "@cm-clone/shared";

/**
 * The detail panel's presentation labels for a club: its stature phrase and the colour its Squad
 * Quality band reads in. Pure, so the panel parts read them without owning the tables.
 */

type QualityBadgeVariant = "default" | "success" | "warning" | "destructive";

/** Keyed by the domain's band union, so a band added to `SQUAD_QUALITY_BANDS` without an entry
 *  here is a type error rather than a silent fallback. The badge shows the band's own word; this
 *  only colours it. The meter's fill is not here: it is the band's ordinal (`filledSegments`),
 *  the same reading the rail takes. */
const QUALITY_VARIANTS: Record<SquadQualityBand, QualityBadgeVariant> = {
  Elite: "default",
  "Very Strong": "success",
  Strong: "success",
  Competitive: "warning",
  Weak: "destructive",
  "Very Weak": "destructive",
};

export const qualityVariantOf = (band: SquadQualityBand): QualityBadgeVariant => QUALITY_VARIANTS[band];

export const statureLabel = (tier: string): string =>
  tier === "big" ? "Major Club" : tier === "mid" ? "Established Club" : "Small Club";
