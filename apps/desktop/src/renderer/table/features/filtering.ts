/**
 * Filtering feature (note: Sorting and filtering by keyboard, AC-30). Filter
 * semantics are OURS — TanStack never sees a filter clause. Two clause kinds:
 * name search (Market/Free Agents) and position (Squad, Market, Free Agents).
 * Visible compact controls and enumerated palette Actions back the same pure
 * `applyFilters`; the palette enumerates the position dimension only (name
 * search is free-form and lives in the visible control). Empty clauses are
 * inert, so clearing is just removing the clause.
 */
import { POSITIONS } from "@cm-clone/shared";
import type { Action, ActionScope, ScopeState } from "../../actions/types.js";
import type { FilterClause, TableId, TableRowShape } from "../types.js";
import { tableLabel } from "./sorting.js";

export interface FilterTableActionInput {
  readonly tableId: TableId;
  readonly filter: FilterClause;
}

export interface ClearFilterTableActionInput {
  readonly tableId: TableId;
}

export const EMPTY_FILTERS: readonly FilterClause[] = [];

export const nameSearchClause = (query: string): FilterClause => ({
  _tag: "nameSearch",
  query,
});

export const positionClause = (position: string): FilterClause => ({
  _tag: "position",
  position,
});

export const matchesNameSearch = (row: TableRowShape, query: string): boolean =>
  `${row.firstName} ${row.lastName}`.toLowerCase().includes(query.trim().toLowerCase());

export const matchesPosition = (row: TableRowShape, position: string): boolean =>
  row.positions.some((p) => p.position === position);

/** Fold every clause over the row set. Inert clauses fall through untouched.
 *  Generic over the row subtype so a concrete table keeps its row type. */
export const applyFilters = <R extends TableRowShape>(
  rows: readonly R[],
  filters: readonly FilterClause[],
): readonly R[] => {
  let out = rows;
  for (const filter of filters) {
    if (filter._tag === "nameSearch") {
      if (filter.query.trim() !== "") out = out.filter((r) => matchesNameSearch(r, filter.query));
    } else {
      out = out.filter((r) => matchesPosition(r, filter.position));
    }
  }
  return out;
};

export const clearFilters = (): readonly FilterClause[] => EMPTY_FILTERS;

/** Fix a single clause in place (visible controls edit the clause by identity,
 *  never by index arithmetic that a reorder could corrupt). */
export const upsertFilter = (
  filters: readonly FilterClause[],
  next: FilterClause,
): readonly FilterClause[] => [
  ...filters.filter((f) => f._tag !== next._tag),
  next,
];

/** Remove the whole clause kind (each kind is present at most once, enforced
 *  by `upsertFilter`). Position re-map needs nothing more: one position at a
 *  time is the model. */
export const removeFilter = (
  filters: readonly FilterClause[],
  filter: FilterClause,
): readonly FilterClause[] => filters.filter((f) => f._tag !== filter._tag);

/** UNUSED-SHAPE guard: the named filter id used by generated actions. Position
 *  clauses produce `<position>` ids; the free-form name clause is never a
 *  palette row, so it needs no stable id here. */
export const clauseId = (filter: FilterClause): string =>
  filter._tag === "position" ? filter.position.toLowerCase() : "name";

/** The palette row label for an enumerable clause. */
export const clauseLabel = (filter: FilterClause): string =>
  filter._tag === "position" ? filter.position : "name search";

const ready = (state: ScopeState): boolean => state.ready === true;

const positionFilterAction = (
  scope: ActionScope,
  tableId: TableId,
  position: string,
): Action => ({
  id: `filter-${tableId}-${position.toLowerCase()}`,
  label: `Filter ${tableLabel(tableId)}: ${position}`,
  scope,
  available: ready,
  handler: () => undefined,
  metadata: { params: { tableId, filter: positionClause(position) } satisfies FilterTableActionInput },
});

/** Enumerated position filters for one table: one palette row per Position. */
export const positionFilterActions = (
  scope: ActionScope,
  tableId: TableId,
): ReadonlyArray<Action> => POSITIONS.map((position) => positionFilterAction(scope, tableId, position));

export const clearFilterTableAction = (
  scope: ActionScope,
  tableId: TableId,
): Action => ({
  id: `clear-filters-${tableId}`,
  label: `Clear ${tableLabel(tableId)} filters`,
  scope,
  available: ready,
  handler: () => undefined,
  metadata: { params: { tableId } satisfies ClearFilterTableActionInput },
});