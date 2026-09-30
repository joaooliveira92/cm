import type { PositionalRatings } from "./positionalRatings.js";

/** The rating at which a line or side appears in the label: CM's own 15, independent of the tier bands. */
export const LABEL_THRESHOLD = 15;

/**
 * The compact CM 03/04 position label (`D/DM RC`, `AM/F RC`, `GK`), a read-time projection of a
 * player's positional ratings. The rule is CM Scout's reconstruction, which matches every CM 03/04
 * label transcribed in contemporary guides. Its suppression rules look like bugs and are not: they
 * are what CM players saw. See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-compact-position-label-follows-cm-scout.md`.
 *
 * - A line or side appears at `LABEL_THRESHOLD` (15) or above.
 * - A goalkeeper renders plain `GK`, whatever else he is rated for.
 * - Lines run SW, D, DM, M, AM, F-or-S, joined by `/`. M shows only if DM and AM are both below 15;
 *   AM only if DM is below 15 and (F is below 15 or M is 15 or above). WB never shows.
 * - The forward line is `F` when Left, Right, Free Role or AM also qualifies, otherwise `S`.
 * - Qualifying sides follow one space, in R, L, C order with no separator. A player with no
 *   qualifying side shows lines alone, and one with no qualifying line has an empty label (the
 *   research does not cover that case; generation never produces it).
 */
export const compactPositionLabel = (ratings: PositionalRatings): string => {
  const qualifies = (value: number): boolean => value >= LABEL_THRESHOLD;
  const { lines, sides } = ratings;
  if (qualifies(lines.GK)) return "GK";

  const forwardIsF = qualifies(sides.L) || qualifies(sides.R) || qualifies(ratings.freeRole) || qualifies(lines.AM);
  const shown: Array<string> = [];
  if (qualifies(lines.SW)) shown.push("SW");
  if (qualifies(lines.D)) shown.push("D");
  if (qualifies(lines.DM)) shown.push("DM");
  if (qualifies(lines.M) && !qualifies(lines.DM) && !qualifies(lines.AM)) shown.push("M");
  if (qualifies(lines.AM) && !qualifies(lines.DM) && (!qualifies(lines.F) || qualifies(lines.M))) shown.push("AM");
  if (qualifies(lines.F)) shown.push(forwardIsF ? "F" : "S");

  const sideSuffix = (["R", "L", "C"] as const).filter((side) => qualifies(sides[side])).join("");
  const lineText = shown.join("/");
  return sideSuffix.length > 0 && lineText.length > 0 ? `${lineText} ${sideSuffix}` : lineText;
};
