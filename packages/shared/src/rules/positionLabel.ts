import type { PositionalRatings } from "./positionalRatings.js";
import { COMPETENT_SUITABILITY } from "./suitability.js";

/**
 * The compact CM 03/04 position label (`D/DM RC`, `AM/F RC`, `GK`), a read-time projection of a
 * player's positional ratings. The rule is CM Scout's reconstruction, which matches every CM 03/04
 * label transcribed in contemporary guides. Its suppression rules look like bugs and are not: they
 * are what CM players saw. See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-compact-position-label-follows-cm-scout.md`.
 *
 * - A line or side appears at 15 or above.
 * - A goalkeeper renders plain `GK`, whatever else he is rated for.
 * - Lines run SW, D, DM, M, AM, F-or-S, joined by `/`. M shows only if DM and AM are both below 15;
 *   AM only if DM is below 15 and (F is below 15 or M is 15 or above). WB never shows.
 * - The forward line is `F` when Left, Right, Free Role or AM also qualifies, otherwise `S`.
 * - Qualifying sides follow one space, in R, L, C order with no separator. A player with no
 *   qualifying side shows lines alone.
 */
export const compactLabel = (ratings: PositionalRatings): string => {
  const has = (value: number): boolean => value >= COMPETENT_SUITABILITY;
  const { lines, sides } = ratings;
  if (has(lines.GK)) return "GK";

  const forwardIsF = has(sides.L) || has(sides.R) || has(ratings.freeRole) || has(lines.AM);
  const shown: Array<string> = [];
  if (has(lines.SW)) shown.push("SW");
  if (has(lines.D)) shown.push("D");
  if (has(lines.DM)) shown.push("DM");
  if (has(lines.M) && !has(lines.DM) && !has(lines.AM)) shown.push("M");
  if (has(lines.AM) && !has(lines.DM) && (!has(lines.F) || has(lines.M))) shown.push("AM");
  if (has(lines.F)) shown.push(forwardIsF ? "F" : "S");

  const sideSuffix = (["R", "L", "C"] as const).filter((side) => has(sides[side])).join("");
  const lineText = shown.join("/");
  return sideSuffix.length > 0 && lineText.length > 0 ? `${lineText} ${sideSuffix}` : lineText;
};
