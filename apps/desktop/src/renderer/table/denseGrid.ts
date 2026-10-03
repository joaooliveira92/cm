/**
 * reui's dense data-grid look (`@reui/c-data-grid-3`) as classes on the shadcn `Table` — a ruled
 * 32px header, a divider between rows, a hover tint, and one cell padding for every column.
 *
 * Two kinds of table ask for it. A read-only one composes these onto plain `Table` parts itself:
 * the Tactics Overview's Selection card (`overviewCards.tsx`), while the tactics editor's Team
 * Selection is the vendored reui grid outright (`TeamSelectionGrid.tsx`). An interactive one opts
 * in through `DataTable`'s `denseGrid` prop, which puts the same look on its heads, rows, and cells
 * without giving up sorting, roving focus, or selection.
 */
export const denseGridTableClass = "mt-1 min-w-full text-left";
export const denseGridHeadRowClass = "border-b border-border-subtle hover:bg-transparent";
export const denseGridHeadClass = "h-8 px-2";
export const denseGridRowClass = "border-b border-border-subtle hover:bg-row-hover";
export const denseGridCellClass = "px-2 py-1.5";