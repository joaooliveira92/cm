/**
 * Display conventions shared across screens, in the same spirit as `theme.ts` and
 * `focus.ts`: a constant or a pure function, never a component.
 */
import type { KnownFigure } from "@cm-clone/shared";

/**
 * Credits — the game's single currency unit (CONTEXT.md). One home for the convention
 * the transfer screens used to spell locally; those local copies now import this
 * canonical reading.
 */
export const formatCredits = (amount: number): string => `${amount.toLocaleString()} Cr`;

/**
 * Format a match minute respecting stoppage-time conventions per half.
 *
 * - First half (half === 1): minute > 45 → `45+N'`, else `minute'`
 * - Second half (half === 2): minute > 90 → `90+N'`, else `minute'`
 */
export const formatMinute = (minute: number, half: 1 | 2): string => {
  if (half === 1 && minute > 45) return `45+${minute - 45}'`;
  if (half === 2 && minute > 90) return `90+${minute - 90}'`;
  return `${minute}'`;
};

/** The number a ranged figure sorts by: its midpoint. An exact figure sorts by its value. */
export const figureMid = (figure: KnownFigure): number =>
  figure._tag === "exact" ? figure.value : (figure.low + figure.high) / 2;

/** Renders a figure: the number when exact, the `low–high` band (en dash) when the read is ranged
 *  by Scouting Progress. Shared by the market tables and the player screens. */
export const formatFigure = (figure: KnownFigure): string =>
  figure._tag === "exact" ? String(figure.value) : `${figure.low}–${figure.high}`;

/** Renders a Credits figure: `1,200,000 Cr` when exact, `500,000 Cr–750,000 Cr` when ranged. */
export const formatFigureCredits = (figure: KnownFigure): string =>
  figure._tag === "exact"
    ? formatCredits(figure.value)
    : `${formatCredits(figure.low)}–${formatCredits(figure.high)}`;
