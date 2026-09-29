/**
 * The formation tables' shared look: the tactics editor's Team Selection and the overview's
 * Selection card. Modelled on reui's dense data grid (`@reui/c-data-grid-3`): a ruled 32px
 * header, a divider between rows, a hover tint, and one cell padding for every column. Kept as
 * classes on the shadcn `Table` rather than the reui component itself, which needs TanStack
 * Table v9 and a dozen vendored files for what are two eleven-row tables.
 */
export const formationTableClass = "mt-2 min-w-full text-left";
export const formationHeadRowClass = "border-b border-border-subtle hover:bg-transparent";
export const formationHeadClass = "h-8 px-2";
export const formationRowClass = "border-b border-border-subtle hover:bg-row-hover";
export const formationCellClass = "px-2 py-1.5";
