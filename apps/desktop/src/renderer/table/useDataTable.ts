/**
 * TanStack instantiation behind the shared table layer (note: shared table
 * layer / Ownership split). TanStack owns row derivation, sorting, and
 * visibility/pinning state machinery; filter semantics, focus/selection,
 * announcements, and persistence are OURS. Data handed in is already filtered
 * by `features/filtering.ts` — TanStack sorts the filtered set.
 */
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import type { SortState, TableRowShape } from "./types.js";

export const useDataTable = <Row extends TableRowShape>(options: {
  readonly columns: ReadonlyArray<ColumnDef<Row, unknown>>;
  readonly data: ReadonlyArray<Row>;
  readonly sort: SortState | null;
  readonly onSortChange: (sort: SortState | null) => void;
  /** Visible-column map (Squad only): `undefined` = all columns show. */
  readonly columnVisibility?: Readonly<Record<string, boolean>>;
  readonly onColumnVisibilityChange?: (visibility: Readonly<Record<string, boolean>>) => void;
  /** Pinned column ids (Squad identity column). */
  readonly pinnedColumnIds?: ReadonlyArray<string>;
  readonly ariaLabel?: string;
}): Table<Row> => {
  const sorting: SortingState = options.sort
    ? [{ id: options.sort.columnId, desc: options.sort.direction === "desc" }]
    : [];

  const table = useReactTable<Row>({
    data: options.data as Row[],
    columns: options.columns as ColumnDef<Row, unknown>[],
    state: {
      sorting,
      columnVisibility: options.columnVisibility,
      // TanStack requires columnPinning to always be an object (it reads
      // `.left`/`.right`); the identity pin lives on the left, nothing right.
      columnPinning: { left: options.pinnedColumnIds ? [...options.pinnedColumnIds] : [], right: [] },
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
    // These tables never paginate. Left on, TanStack's auto-reset fires
    // `resetPageIndex` -> `setPagination` -> `onStateChange` on every data
    // identity change, which re-renders, which produces the next data
    // identity: a self-sustaining render loop. See the note in this file.
    autoResetPageIndex: false,
    enableMultiSort: false,
    enableSortingRemoval: true,
    // Filters are applied before TanStack sees the rows — TanStack never filters.
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return table;
};

/** The visible row ids ordered as TanStack derives them (the roving universe). */
export const visibleRowIds = <Row extends TableRowShape>(
  table: Table<Row>,
): readonly string[] => table.getRowModel().rows.map((row) => row.original.id);