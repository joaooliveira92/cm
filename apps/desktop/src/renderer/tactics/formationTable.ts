/**
 * The Tactics Overview's Selection card: reui's dense data-grid look (`@reui/c-data-grid-3`) as
 * classes on the shadcn `Table` — a ruled 32px header, a divider between rows, a hover tint, and
 * one cell padding for every column. The tactics editor's Team Selection is the vendored reui grid
 * itself (`TeamSelectionGrid.tsx`); this card is read-only and has no use for the grid's machinery.
 */
export const formationTableClass = "mt-2 min-w-full text-left";
export const formationHeadRowClass = "border-b border-border-subtle hover:bg-transparent";
export const formationHeadClass = "h-8 px-2";
export const formationRowClass = "border-b border-border-subtle hover:bg-row-hover";
export const formationCellClass = "px-2 py-1.5";
