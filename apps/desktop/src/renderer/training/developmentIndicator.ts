/**
 * Player Development Centre (Screen 114) wording for a player's newest recorded Season of Player
 * Development.
 *
 * Pure: no atom, route, or engine import. Main already compared the Season's recorded Attributes with
 * the previous recorded Season; this module only counts the changes it returned by direction and words
 * them. It invents no rating, trend, or forecast, and a Season with nothing to compare with says so
 * rather than reading as zero changes.
 */

/** The newest recorded Season, as `SeasonDevelopmentView` carries it; `null` when none is recorded. */
export interface LatestDevelopment {
  readonly seasonNumber: number;
  readonly comparedWithSeason: number | null;
  readonly changes: ReadonlyArray<{ readonly from: number; readonly to: number }>;
}

/** How many visible Attributes rose and fell in the Season's recorded changes. */
export const countDirections = (
  changes: LatestDevelopment["changes"],
): { readonly rose: number; readonly fell: number } => ({
  rose: changes.filter((change) => change.to > change.from).length,
  fell: changes.filter((change) => change.to < change.from).length,
});

const attributes = (count: number): string => `${count} ${count === 1 ? "Attribute" : "Attributes"}`;

/** The one-line development indicator for a player's row. */
export const describeLatestDevelopment = (latest: LatestDevelopment | null): string => {
  if (latest === null) {
    return "No comparison yet: no Season has concluded with this player at your club.";
  }

  const { rose, fell } = countDirections(latest.changes);

  // No baseline and nothing moved: the first recorded Season has nothing to compare with.
  if (latest.comparedWithSeason === null && rose === 0 && fell === 0) {
    return `No comparison yet: Season ${latest.seasonNumber} is the first recorded at your club.`;
  }

  // A baseline-bearing Season (`comparedWithSeason === null` with changes) is growth within that
  // Season; a numbered comparison is measured since the Season it names.
  const basis =
    latest.comparedWithSeason === null
      ? "from the Season's starting point"
      : `since Season ${latest.comparedWithSeason}`;

  if (rose === 0 && fell === 0) {
    return `Season ${latest.seasonNumber}: no Attribute changed ${basis}.`;
  }
  if (fell === 0) {
    return `Season ${latest.seasonNumber}: ${attributes(rose)} rose ${basis}.`;
  }
  if (rose === 0) {
    return `Season ${latest.seasonNumber}: ${attributes(fell)} fell ${basis}.`;
  }
  return `Season ${latest.seasonNumber}: ${attributes(rose)} rose and ${fell} fell ${basis}.`;
};
