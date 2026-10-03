/**
 * The TanStack Table v9 feature bundle every table in the renderer is built on, and the aliases
 * that bind its generics. v9 types each table by the features it registers, so a column, row or
 * table value only carries the methods its bundle declares: `row.getVisibleCells()` needs
 * `columnVisibilityFeature`, the identity pin needs pinning plus sizing (`getStart`/`getSize`).
 *
 * Filtering and pagination are deliberately absent. Rows arrive already filtered
 * (`features/filtering.ts`), and these tables never paginate.
 */
import {
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  tableFeatures,
  type CellData,
  type ColumnDef,
  type Row,
  type RowData,
  type SortFn,
  type Table,
} from "@tanstack/react-table";

export const appTableFeatures = tableFeatures({
  columnVisibilityFeature,
  columnPinningFeature,
  columnSizingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  // `sortFn: "auto"` (the default) names one of these from the first row's value, and resolves
  // the name against this map alone, so it must carry every built-in.
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
    textCaseSensitive: sortFn_textCaseSensitive,
  },
});

export type AppTableFeatures = typeof appTableFeatures;
export type AppColumnDef<TData extends RowData, TValue extends CellData = CellData> = ColumnDef<
  AppTableFeatures,
  TData,
  TValue
>;
export type AppTable<TData extends RowData> = Table<AppTableFeatures, TData>;
export type AppRow<TData extends RowData> = Row<AppTableFeatures, TData>;
export type AppSortFn<TData extends RowData> = SortFn<AppTableFeatures, TData>;
