import type { SquadQualityBand } from "@cm-clone/shared";
import { QUALITY_SEGMENTS, filledSegments } from "./model.js";

/**
 * The detail panel's presentation labels for a club: its stature phrase and how its Squad Quality
 * band reads. Pure, so the panel parts read them without owning the tables.
 */

type QualityBadgeVariant = "default" | "success" | "warning" | "destructive" | "outline";

export interface QualityPresentation {
  /** The badge's coarse word for the band. */
  readonly label: string;
  readonly variant: QualityBadgeVariant;
  /** The meter's fill: the band's ordinal position in `SQUAD_QUALITY_BANDS`, as a percentage —
   *  the same reading the rail's segmented meter takes, so the two never disagree. */
  readonly percent: number;
}

/** Keyed by the domain's band union, so a band added to `SQUAD_QUALITY_BANDS` without an entry
 *  here is a type error rather than a silent fallback. */
const QUALITY_BADGES: Record<SquadQualityBand, Pick<QualityPresentation, "label" | "variant">> = {
  Elite: { label: "Elite", variant: "default" },
  "Very Strong": { label: "Strong", variant: "success" },
  Strong: { label: "Strong", variant: "success" },
  Competitive: { label: "Solid", variant: "warning" },
  Weak: { label: "Modest", variant: "destructive" },
  "Very Weak": { label: "Modest", variant: "destructive" },
};

export const qualityPresentationOf = (band: SquadQualityBand): QualityPresentation => ({
  ...QUALITY_BADGES[band],
  percent: (filledSegments(band) / QUALITY_SEGMENTS) * 100,
});

export const statureLabel = (tier: string): string =>
  tier === "big" ? "Major Club" : tier === "mid" ? "Established Club" : "Small Club";
