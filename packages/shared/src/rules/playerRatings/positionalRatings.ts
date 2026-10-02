/**
 * The positional lines a player is rated on, as Championship Manager 03/04 stored them: one 1-20
 * rating per line, independent of side. WB is a line with no row of its own on the tactics grid; it
 * decides fit for the wide D and DM cells. See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md`.
 */
export const LINES = ["GK", "SW", "D", "DM", "M", "AM", "F", "WB"] as const;
export type Line = (typeof LINES)[number];

/** The sides a player is rated on, each 1-20, independent of line. Stored and labelled R, L, C. */
export const SIDES = ["R", "L", "C"] as const;
export type Side = (typeof SIDES)[number];

export const POSITIONAL_RATING_MIN = 1;
export const POSITIONAL_RATING_MAX = 20;

/**
 * A player's twelve positional ratings: eight Line Ratings, three Side Ratings and the hidden Free
 * Role Rating. Persisted primitives, like Attributes, changed only by retraining; everything else
 * positional (suitability, Familiarity Tier, the compact label, Position and Overall Rating) is
 * derived from them on read. No screen shows these numbers.
 */
export interface PositionalRatings {
  readonly lines: Readonly<Record<Line, number>>;
  readonly sides: Readonly<Record<Side, number>>;
  readonly freeRole: number;
}
