/**
 * TanStack instantiation behind the shared table layer (note: shared table
 * layer / Ownership split). TanStack owns row derivation, sorting, and
 * visibility/pinning state machinery; filter semantics, focus/selection,
 * announcements, and persistence are OURS. Data handed in is already filtered
 * by `features/filtering.ts` — TanStack sorts the filtered set.
 */
import { useTable, type SortingState } from "@tanstack/react-table";
import { appTableFeatures, type AppColumnDef, type AppTable } from "./tableFeatures.js";
import type { SortState, TableRowShape } from "./types.js";

export const useDataTable = <Row extends TableRowShape>(options: {
  readonly columns: ReadonlyArray<AppColumnDef<Row>>;
  readonly data: ReadonlyArray<Row>;
  readonly sort: SortState | null;
  readonly onSortChange: (sort: SortState | null) => void;
  /** Visible-column map (Squad only): `undefined` = all columns show. */
  readonly columnVisibility?: Readonly<Record<string, boolean>>;
  readonly onColumnVisibilityChange?: (visibility: Readonly<Record<string, boolean>>) => void;
  /** Pinned column ids (Squad identity column). */
  readonly pinnedColumnIds?: ReadonlyArray<string>;
  readonly ariaLabel?: string;
}): AppTable<Row> => {
  const sorting: SortingState = options.sort
    ? [{ id: options.sort.columnId, desc: options.sort.direction === "desc" }]
    : [];

  const table = useTable({
    features: appTableFeatures,
    data: options.data as Row[],
    columns: options.columns as AppColumnDef<Row>[],
    state: {
      sorting,
      columnVisibility: options.columnVisibility,
      // TanStack requires columnPinning to always be an object (it reads
      // `.start`/`.end`); the identity pin lives at the start, nothing at the end.
      columnPinning: { start: options.pinnedColumnIds ? [...options.pinnedColumnIds] : [], end: [] },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      options.onSortChange(
        first === undefined
          ? null
          : { columnId: first.id, direction: first.desc ? "desc" : "asc" },
      );
    },
    onColumnVisibilityChange: (updater) => {
      if (options.onColumnVisibilityChange === undefined) return;
      const next =
        typeof updater === "function"
          ? updater(options.columnVisibility ?? {})
          : updater;
      options.onColumnVisibilityChange(next);
    },
    enableMultiSort: false,
    enableSortingRemoval: true,
  });

  return table;
};

/** The visible row ids ordered as TanStack derives them (the roving universe). */
export const visibleRowIds = <Row extends TableRowShape>(
  table: AppTable<Row>,
): readonly string[] => table.getRowModel().rows.map((row) => row.original.id);