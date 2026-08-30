/**
 * Sorting feature (note: Sorting and filtering by keyboard, AC-30). Controlled
 * sort state: one active sort, header buttons cycle asc → desc → none, the
 * palette drives the same command via enumerated parameterized Actions. Pure
 * `cycleSort` is the single transition law both surfaces obey.
 */
import type { Action, ActionScope, ScopeState } from "../../actions/types.js";
import type { ColumnId, SortDirection, SortState, TableId } from "../types.js";

/** The palette-facing direction string (note's `SortTableActionInput`). */
export type SortDirectionInput = "ascending" | "descending";

export interface SortTableActionInput {
  readonly tableId: TableId;
  readonly columnId: ColumnId;
  readonly direction: SortDirectionInput;
}

export const sortDirectionOf = (direction: SortDirection): SortDirectionInput =>
  direction === "asc" ? "ascending" : "descending";

export const sortDirectionFrom = (direction: SortDirectionInput): SortDirection =>
  direction === "ascending" ? "asc" : "desc";

/** Cycle a header toggle: none → asc → desc → none for the same column; a
 *  different column restarts at asc. `null` = natural order. */
export const cycleSort = (current: SortState | null, columnId: ColumnId): SortState | null => {
  if (current === null || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (current.direction === "asc") return { columnId, direction: "desc" };
  return null;
};

const TABLE_LABELS: Readonly<Record<TableId, string>> = {
  squad: "Squad",
  "transfer-market": "Market",
  "free-agents": "Free Agents",
  "incoming-bids": "Incoming Bids",
  "outgoing-bids": "Outgoing Bids",
  "league-table": "League Table",
};

export const tableLabel = (tableId: TableId): string => TABLE_LABELS[tableId];

const ready = (state: ScopeState): boolean => state.ready === true;

/** The parameterized palette Action carrying its own params; the palette
 *  dispatches `metadata.params` through. Availability is a frontend
 *  optimisation, never a permission gate — the backend validates. */
export const sortTableAction = (
  scope: ActionScope,
  tableId: TableId,
  columnId: ColumnId,
  columnLabel: string,
  direction: SortDirectionInput,
): Action => ({
  id: `sort-${tableId}-${columnId}-${direction}`,
  label: `Sort ${tableLabel(tableId)} by ${columnLabel} (${direction})`,
  scope,
  available: ready,
  handler: () => undefined,
  metadata: { params: { tableId, columnId, direction } satisfies SortTableActionInput },
});

export interface ClearSortTableActionInput {
  readonly tableId: TableId;
}

export const clearSortTableAction = (scope: ActionScope, tableId: TableId): Action => ({
  id: `clear-sort-${tableId}`,
  label: `Clear ${tableLabel(tableId)} sort`,
  scope,
  available: ready,
  handler: () => undefined,
  metadata: { params: { tableId } satisfies ClearSortTableActionInput },
});