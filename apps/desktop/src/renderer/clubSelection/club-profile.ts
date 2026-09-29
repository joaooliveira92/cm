/**
 * The detail panel's presentation labels for a club: its stature phrase, the quality badge and the
 * squad-quality meter's fill. Pure, so the panel parts read them without owning the tables.
 */

type QualityBadgeVariant = "default" | "success" | "warning" | "destructive" | "outline";

interface QualityBadge {
  readonly label: string;
  readonly variant: QualityBadgeVariant;
}

const QUALITY_LABEL: Record<string, QualityBadge> = {
  Champion: { label: "Elite", variant: "default" },
  Exceptional: { label: "Elite", variant: "default" },
  Excellent: { label: "Strong", variant: "success" },
  "Very Good": { label: "Strong", variant: "success" },
  Good: { label: "Solid", variant: "warning" },
  Acceptable: { label: "Solid", variant: "warning" },
  "Below Average": { label: "Modest", variant: "destructive" },
  Poor: { label: "Modest", variant: "destructive" },
};

const QUALITY_ORDER = ["Champion", "Exceptional", "Excellent", "Very Good", "Good", "Acceptable", "Below Average", "Poor"];

/** The band's badge, falling back to the band itself in an outline badge when the table has no entry. */
export const qualityBadgeOf = (band: string): QualityBadge =>
  QUALITY_LABEL[band] ?? { label: band, variant: "outline" };

export const statureLabel = (tier: string): string =>
  tier === "big" ? "Major Club" : tier === "mid" ? "Established Club" : "Small Club";

export const qualityPercentOf = (band: string): number => {
  const idx = QUALITY_ORDER.indexOf(band);
  if (idx === -1) return 0;
  return ((idx + 1) / 8) * 100;
};
