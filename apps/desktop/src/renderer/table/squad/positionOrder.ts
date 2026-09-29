/**
 * The order the Positions column sorts by: CM's pitch order, back to front — Goalkeeper, Sweeper,
 * Defender, Wing Back, Defensive Midfield, Midfielder, Attacking Midfield, Forward, Striker — and
 * right, left, centre within each area. Alphabetical order put AMC first and GK in the middle.
 *
 * The game has fewer positions than CM, so most of the areas above have no position yet. A new
 * position goes in its area's slot here, or it sorts after every listed one.
 */
const POSITION_ORDER: readonly string[] = [
  "GK",
  "DR",
  "DL",
  "DC",
  "DM",
  "MR",
  "ML",
  "MC",
  "AMC",
  "ST",
];

const rankOf = (position: string): number => {
  const index = POSITION_ORDER.indexOf(position);
  return index === -1 ? POSITION_ORDER.length : index;
};

/**
 * A player's place in pitch order: his earliest natural position, or his earliest listed one when
 * none is natural. Positions arrive in storage order, not pitch order, so "first listed" means
 * nothing.
 */
export const positionSortRank = (
  positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>,
): number => {
  const natural = positions.filter((p) => p.familiarity === "natural");
  const ranked = natural.length > 0 ? natural : positions;
  return ranked.reduce((best, p) => Math.min(best, rankOf(p.position)), POSITION_ORDER.length);
};
