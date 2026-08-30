/**
 * Enumerated palette Actions for sorting and filtering (note: Sorting and
 * filtering by keyboard, AC-30). The header buttons cover every sortable column
 * for pointing users; the palette reaches the primary dimensions by keyword.
 * Position filters are enumerated per Position; the free-form name search has
 * no palette row (visible control only). Every row carries its typed parameters
 * in `metadata.params`; the palette dispatches them through `dispatchAction`.
 */
import type { Action, ActionScope } from "../actions/types.js";
import type { TableId } from "./types.js";
import {
  clearSortTableAction,
  sortTableAction,
} from "./features/sorting.js";
import {
  clearFilterTableAction,
  positionFilterActions,
} from "./features/filtering.js";
import { SQUAD_COLUMN_LABELS } from "./squad/squadColumns.js";
import { MARKET_COLUMN_LABELS } from "./transfers/marketColumns.js";

export interface TablePaletteActionOptions {
  readonly scope: ActionScope;
  readonly tableId: TableId;
  /** The columns this table's palette offers to sort by (a curated subset of
   *  the header-sortable set — the headers still cover every column). */
  readonly sortableColumnIds: readonly string[];
  readonly columnLabels: Readonly<Record<string, string>>;
}

export const tableSortAndFilterActions = (
  options: TablePaletteActionOptions,
): ReadonlyArray<Action> => {
  const out: Action[] = [];
  for (const columnId of options.sortableColumnIds) {
    const label = options.columnLabels[columnId] ?? columnId;
    out.push(sortTableAction(options.scope, options.tableId, columnId, label, "ascending"));
    out.push(sortTableAction(options.scope, options.tableId, columnId, label, "descending"));
  }
  out.push(clearSortTableAction(options.scope, options.tableId));
  out.push(...positionFilterActions(options.scope, options.tableId));
  out.push(clearFilterTableAction(options.scope, options.tableId));
  return out;
};

/**
 * The one shared option set per table. `ALL_ACTIONS` builds the registry rows
 * and the screens build their live handlers from THE SAME options, so a palette
 * id always has a handler while its screen is mounted (AC-16: the palette can
 * never list an Action the registry cannot dispatch).
 */
export const SQUAD_PALETTE_OPTIONS: TablePaletteActionOptions = {
  scope: "squad",
  tableId: "squad",
  sortableColumnIds: ["name", "age", "overall"],
  columnLabels: SQUAD_COLUMN_LABELS,
};

export const MARKET_PALETTE_OPTIONS: TablePaletteActionOptions = {
  scope: "transfers",
  tableId: "transfer-market",
  sortableColumnIds: ["name", "age", "overall", "value"],
  columnLabels: MARKET_COLUMN_LABELS,
};

export const FREE_AGENT_PALETTE_OPTIONS: TablePaletteActionOptions = {
  scope: "transfers",
  tableId: "free-agents",
  sortableColumnIds: ["name", "age", "overall", "value"],
  columnLabels: MARKET_COLUMN_LABELS,
};

/** The ids `tableSortAndFilterActions` produced, for live-handler registration. */
export const tablePaletteActionIds = (options: TablePaletteActionOptions): readonly string[] =>
  tableSortAndFilterActions(options).map((action) => action.id);