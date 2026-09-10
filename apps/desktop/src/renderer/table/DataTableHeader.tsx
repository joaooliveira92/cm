import { flexRender } from "@tanstack/react-table";
import type { Table as TanStackTable } from "@tanstack/react-table";
import {
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { FOCUS_RING } from "../focus.js";
import { useTableCtx } from "./DataTableContext.js";
import type { SortState, TableRowShape } from "./types.js";
import { cycleSort } from "./features/sorting.js";

export interface DataTableHeaderProps<Row extends TableRowShape> {
  readonly table: TanStackTable<Row>;
}

export const DataTableHeader = <Row extends TableRowShape>(
  props: DataTableHeaderProps<Row>,
) => {
  const { table } = props;
  const { onSortChange } = useTableCtx();

  const cycleSortHeader = (columnId: string): void => {
    const current = table.getState().sorting[0];
    const currentSort: SortState | null =
      current === undefined
        ? null
        : { columnId: current.id, direction: current.desc ? "desc" : "asc" };
    onSortChange(cycleSort(currentSort, columnId));
  };

  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          key={headerGroup.id}
          className="border-panel-border hover:bg-transparent"
        >
          {headerGroup.headers.map((header) => {
            const sortable = header.column.getCanSort();
            const sortState = header.column.getIsSorted();
            const label = flexRender(
              header.column.columnDef.header,
              header.getContext(),
            );
            return (
              <TableHead
                key={header.id}
                aria-sort={
                  sortable && sortState === "asc"
                    ? "ascending"
                    : sortable && sortState === "desc"
                      ? "descending"
                      : undefined
                }
                className={`whitespace-nowrap ${header.column.getIsPinned() === false ? "" : "bg-bg-base"}`}
                style={pinnedStyle(header.column)}
              >
                {sortable ? (
                  <button
                    type="button"
                    className={`flex items-center gap-1 ${FOCUS_RING.join(" ")}`}
                    onClick={() => cycleSortHeader(header.column.id)}
                  >
                    <span>{label}</span>
                    <span
                      aria-hidden="true"
                      className="text-[0.65rem] text-text-secondary"
                    >
                      {sortState === "asc"
                        ? "▲"
                        : sortState === "desc"
                          ? "▼"
                          : "↕"}
                    </span>
                  </button>
                ) : (
                  label
                )}
              </TableHead>
            );
          })}
        </TableRow>
      ))}
    </TableHeader>
  );
};

const pinnedStyle = (column: {
  readonly getIsPinned: () => false | "left" | "right";
  readonly getStart: (position?: "left" | "center" | "right") => number;
  readonly getSize: () => number;
}): React.CSSProperties | undefined => {
  if (column.getIsPinned() !== "left") return undefined;
  const width = column.getSize();
  return {
    position: "sticky",
    left: column.getStart("left"),
    zIndex: 1,
    width,
    minWidth: width,
    maxWidth: width,
  };
};