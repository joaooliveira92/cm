import { selectBestFormationXI, type PositionRatingsLike } from "./bestXi.js";

// ---------------------------------------------------------------------------
// Squad Quality bands
// ---------------------------------------------------------------------------

export const SQUAD_QUALITY_BANDS = [
  "Very Weak",
  "Weak",
  "Competitive",
  "Strong",
  "Very Strong",
  "Elite",
] as const;

export type SquadQualityBand = (typeof SQUAD_QUALITY_BANDS)[number];

/**
 * Absolute thresholds for Squad Quality bands (mean Position Rating of the strongest formation-valid
 * XI). Derived from measurements of the shipped generator — tuning data that must be re-measured
 * whenever generation changes.
 */
export const SQUAD_QUALITY_THRESHOLDS: ReadonlyArray<{ readonly maxScore: number; readonly band: SquadQualityBand }> = [
  { maxScore: 35, band: "Very Weak" },
  { maxScore: 42, band: "Weak" },
  { maxScore: 49, band: "Competitive" },
  { maxScore: 56, band: "Strong" },
  { maxScore: 63, band: "Very Strong" },
];

/**
 * Map a raw mean Position Rating to its Squad Quality band. Values at or above the last threshold's
 * maxScore fall into "Elite" (the highest band, with no upper bound).
 */
export const squadQualityBand = (meanPositionRating: number): SquadQualityBand => {
  for (const { maxScore, band } of SQUAD_QUALITY_THRESHOLDS) {
    if (meanPositionRating < maxScore) return band;
  }
  return "Elite";
};

/**
 * Compute a club's Squad Quality from its squad's Position Ratings. Returns the band and the raw
 * mean score (the latter for internal use only — selection UIs show the band, never the number).
 */
export const computeSquadQuality = (
  squad: ReadonlyArray<PositionRatingsLike>,
): { readonly band: SquadQualityBand; readonly meanPositionRating: number } | null => {
  const result = selectBestFormationXI(squad);
  if (result._tag === "failure") return null;
  return { band: squadQualityBand(result.meanPositionRating), meanPositionRating: result.meanPositionRating };
};