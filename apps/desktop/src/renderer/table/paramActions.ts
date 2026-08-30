/**
 * Parameter interpretation for the enumerated table palette Actions (AC-30).
 * The palette dispatches `metadata.params`; a screen's single live handler for
 * every table row classifies those params into one of four commands (set-sort,
 * set-filter, clear-sort, clear-filters). Pure and unit-tested — interpreting
 * params is shared so the Squad and Transfers handlers cannot diverge.
 */
import type { SortDirectionInput } from "./features/sorting.js";
import { sortDirectionFrom } from "./features/sorting.js";
import type { FilterClause, SortState, TableId } from "./types.js";

export interface TableParamAction {
  readonly kind: "set-sort" | "set-filter" | "clear-sort" | "clear-filters";
  readonly tableId: TableId;
  readonly sort?: SortState;
  readonly filter?: FilterClause;
}

/** Classify an enumerated table Action's params. `null` when malformed. */
export const classifyTableParamAction = (
  actionId: string,
  params: unknown,
): TableParamAction | null => {
  if (typeof params !== "object" || params === null) return null;
  const p = params as Readonly<Record<string, unknown>>;
  if (typeof p.tableId !== "string") return null;
  const tableId = p.tableId as TableId;

  if (
    typeof p.direction === "string" &&
    typeof p.columnId === "string" &&
    (p.direction === "ascending" || p.direction === "descending")
  ) {
    return {
      kind: "set-sort",
      tableId,
      sort: { columnId: p.columnId, direction: sortDirectionFrom(p.direction as SortDirectionInput) },
    };
  }
  if (typeof p.filter === "object" && p.filter !== null) {
    const filter = p.filter as Readonly<{ _tag?: unknown; query?: unknown; position?: unknown }>;
    if (filter._tag === "nameSearch" && typeof filter.query === "string") {
      return { kind: "set-filter", tableId, filter: { _tag: "nameSearch", query: filter.query } };
    }
    if (filter._tag === "position" && typeof filter.position === "string") {
      return { kind: "set-filter", tableId, filter: { _tag: "position", position: filter.position } };
    }
  }
  if (actionId.startsWith("clear-sort-")) return { kind: "clear-sort", tableId };
  if (actionId.startsWith("clear-filters-")) return { kind: "clear-filters", tableId };
  return null;
};