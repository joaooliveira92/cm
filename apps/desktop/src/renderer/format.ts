/**
 * Display conventions shared across screens, in the same spirit as `theme.ts` and
 * `focus.ts`: a constant or a pure function, never a component.
 */

/**
 * Credits — the game's single currency unit (CONTEXT.md). One home for the convention
 * `TransfersScreen` already spells locally; that local copy stays until that screen is next
 * touched, and this is the canonical reading.
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
