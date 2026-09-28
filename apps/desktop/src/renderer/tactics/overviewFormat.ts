/** Display helpers the Tactics Overview's pitch and cards share. */

export const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** "BallPlayingDefender" → "Ball Playing Defender". */
export const roleLabel = (role: string): string => role.replace(/(?<!^)([A-Z])/g, " $1");

/** How well a 1-100 rating fits: 70 and up is a strong fit, under 50 a poor one. */
type Fit = "strong" | "fair" | "poor" | "none";

const fitOf = (rating: number | null): Fit =>
  rating === null ? "none" : rating >= 70 ? "strong" : rating >= 50 ? "fair" : "poor";

const TEXT: Record<Fit, string> = {
  strong: "text-text-success",
  fair: "text-foreground",
  poor: "text-text-warning",
  none: "text-text-muted",
};

const FILL: Record<Fit, string> = {
  strong: "bg-text-success",
  fair: "bg-text-secondary",
  poor: "bg-text-warning",
  none: "bg-transparent",
};

const BORDER: Record<Fit, string> = {
  strong: "border-text-success",
  fair: "border-text-highlight",
  poor: "border-text-warning",
  none: "border-text-bright/70",
};

export const ratingText = (rating: number | null): string => TEXT[fitOf(rating)];
export const ratingFill = (rating: number | null): string => FILL[fitOf(rating)];
export const ratingBorder = (rating: number | null): string => BORDER[fitOf(rating)];
