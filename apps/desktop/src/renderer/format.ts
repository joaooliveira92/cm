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
