import { flexRender, type Row } from "@tanstack/react-table";
import { TableBody, TableCell, TableRow } from "../components/ui/table.js";
import { FOCUS_RING, focusIdOf, rovingTabIndex } from "../focus.js";
import { useTableCtx, type TableDensity } from "./DataTableContext.js";
import type { TableRowShape } from "./types.js";

export interface DataTableBodyProps<TRow extends TableRowShape> {
  readonly rows: readonly Row<TRow>[];
}

export const DataTableBody = <TRow extends TableRowShape>(props: DataTableBodyProps<TRow>) => {
  const { rows } = props;
  const ctx = useTableCtx();

  return (
    <TableBody onKeyDown={ctx.onBodyKeyDown}>
      {rows.map((row) => {
        const id = row.original.id;
        const isIdentity = (columnId: string): boolean => columnId === ctx.identityColumnId;
        return (
          <TableRow key={id} className={ROW_CLASS[ctx.density]} aria-selected={ctx.selectedId === id || undefined}>
            {row.getVisibleCells().map((cell) => {
              const cellClass = `whitespace-nowrap ${cell.column.getIsPinned() !== false && ctx.scrolledFromLeft ? PINNED_CELL_CLASS : ""}`;
              const style = pinnedStyle(cell.column);
              if (isIdentity(cell.column.id)) {
                return (
                  <TableCell key={cell.id} className={`overflow-hidden text-ellipsis ${cellClass}`} style={style}>
                    <button
                      type="button"
                      data-focus-id={focusIdOf(ctx.screen, ctx.region, id)}
                      tabIndex={rovingTabIndex(ctx.effectiveActive, id)}
                      draggable={ctx.onRowDragStart !== undefined}
                      onDragStart={(event) => { if (ctx.onRowDragStart !== undefined) ctx.onRowDragStart(event, id); }}
                      onFocus={() => { if (ctx.activeId !== id) ctx.onActiveChange(id); }}
                      onClick={(event) => {
                        if (ctx.onIdentityOpen !== undefined) ctx.onIdentityOpen(id, event);
                        else ctx.onToggleSelection(id);
                      }}
                      className={`truncate ${NAME_CLASS[ctx.density]} font-semibold text-text-bright ${FOCUS_RING.join(" ")}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </button>
                  </TableCell>
                );
              }
              return (
                <TableCell key={cell.id} className={cellClass} style={style}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </TableBody>
  );
};

const ROW_CLASS: Readonly<Record<TableDensity, string>> = {
  compact: "group",
  comfortable: "group h-9",
};

/** The identity button's type role. Compact inherits the cell's `text-data`; comfortable
 *  reads the name at `text-body`, as the position list does. */
const NAME_CLASS: Readonly<Record<TableDensity, string>> = {
  compact: "",
  comfortable: "text-body",
};

const PINNED_CELL_CLASS = "bg-bg-base group-hover:bg-row-hover group-aria-selected:bg-row-selected!";

const pinnedStyle = (column: {
  readonly getIsPinned: () => false | "left" | "right";
  readonly getStart: (position?: "left" | "center" | "right") => number;
  readonly getSize: () => number;
}): React.CSSProperties | undefined => {
  if (column.getIsPinned() !== "left") return undefined;
  const width = column.getSize();
  return { position: "sticky", left: column.getStart("left"), zIndex: 1, width, minWidth: width, maxWidth: width };
};