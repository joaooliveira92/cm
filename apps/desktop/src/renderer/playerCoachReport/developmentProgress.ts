/**
 * Performance Report (Screen 113) presentation rules for recorded Player Development.
 *
 * Pure: no atom, route, or engine import. Main already derived every number; this module only
 * words them, so the renderer computes no development of its own.
 */

/** An Attribute's display name: `firstTouch` reads "First Touch", `gkHandling` "GK Handling". */
export const attributeLabel = (attribute: string): string =>
  attribute
    .replace(/(?<=[a-z])(?=[A-Z])/g, " ")
    .replace(/^gk /, "GK ")
    .replace(/^./, (first) => first.toUpperCase());

/** One Attribute change as a sentence fragment carrying its direction in text, never colour alone:
 *  "Passing 10 to 12 (+2)". */
export const describeAttributeChange = (change: {
  readonly attribute: string;
  readonly from: number;
  readonly to: number;
}): string => {
  const delta = change.to - change.from;
  return `${attributeLabel(change.attribute)} ${change.from} to ${change.to} (${delta > 0 ? "+" : ""}${delta})`;
};

/** The line under a Season's heading saying what it was measured against. */
export const describeComparison = (season: {
  readonly comparedWithSeason: number | null;
  readonly changes: ReadonlyArray<unknown>;
}): string => {
  if (season.comparedWithSeason === null) {
    return "First recorded Season at your club. No earlier Attributes were recorded to compare with.";
  }
  return season.changes.length === 0
    ? `No Attribute changed since Season ${season.comparedWithSeason}.`
    : `Changes since Season ${season.comparedWithSeason}:`;
};
