import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useScrollEdges } from "./useScrollEdges.js";
import { useTableKeyboard } from "./useTableKeyboard.js";
import TableCtx from "./DataTableContext.js";
import type { SortState, TableRowShape } from "./types.js";
import type { TableFocusBookmark } from "./focusBookmark.js";
import type { Table as TanStackTable } from "@tanstack/react-table";

const EDGE_FADE_BASE =
  "pointer-events-none absolute inset-y-0 w-8 transition-opacity duration-150";

export { useTableCtx, type TableContextValue } from "./DataTableContext.js";
export { scrollEdges, type ScrollEdges } from "./useScrollEdges.js";
export { useTableKeyboard, effectiveActiveId } from "./useTableKeyboard.js";
import { DataTableHeader } from "./DataTableHeader.js";
import { DataTableBody } from "./DataTableBody.js";

export interface DataTableRootProps<Row extends TableRowShape> {
  readonly tableId: TableFocusBookmark["tableId"];
  readonly screen: string;
  readonly region: string;
  readonly table: TanStackTable<Row>;
  readonly orderedIds: readonly string[];
  readonly identityColumnId: string;
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
  readonly selectedId: string | null;
  readonly onToggleSelection: (id: string) => void;
  readonly onSortChange: (sort: SortState | null) => void;
  readonly onRowPrimary?: (id: string) => void;
  readonly onRowDragStart?: (event: React.DragEvent<HTMLButtonElement>, rowId: string) => void;
  readonly ariaLabel: string;
  readonly announcement: string;
  readonly ariaBusy?: boolean;
  readonly initialScrollLeft?: number;
  readonly onScrollCommit?: (scrollLeft: number) => void;
  readonly children: ReactNode;
}

export const DataTableRoot = <Row extends TableRowShape>(props: DataTableRootProps<Row>) => {
  const {
    tableId, screen, region, table, orderedIds, identityColumnId,
    activeId, onActiveChange, onBookmarkChange, selectedId, onToggleSelection,
    onSortChange, onRowPrimary, onRowDragStart, ariaLabel, announcement,
    ariaBusy, initialScrollLeft, onScrollCommit, children,
  } = props;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Restore before `useScrollEdges` measures: layout effects run in declaration
  // order, and the re-render from the `scroll` this write fires commits after
  // the first paint.
  useLayoutEffect(() => {
    if (scrollRef.current !== null && initialScrollLeft !== undefined) {
      scrollRef.current.scrollLeft = initialScrollLeft;
    }
  }, [initialScrollLeft]);

  const { edges, syncEdges } = useScrollEdges(scrollRef, [
    orderedIds.length,
    table.getVisibleFlatColumns().length,
  ]);

  const { onBodyKeyDown, effectiveActive } = useTableKeyboard({
    orderedIds, activeId, onActiveChange, onBookmarkChange, onToggleSelection,
    onRowPrimary, screen, region, tableId,
    shiftScrollRef: onScrollCommit !== undefined ? scrollRef : undefined,
    onShiftScrollCommit: onScrollCommit,
  });

  return (
    <TableCtx.Provider value={{
      screen, region, identityColumnId, activeId, onActiveChange, onSortChange,
      selectedId, onToggleSelection, onRowPrimary, onRowDragStart,
      effectiveActive, onBodyKeyDown,
    }}>
      <div className="relative">
        <div data-table-scroll ref={scrollRef} className="mt-2 overflow-x-auto" aria-busy={ariaBusy || undefined} role="group" aria-label={ariaLabel} onScroll={syncEdges}>
          {children}
          <div role="status" aria-live="polite">{announcement}</div>
        </div>
        <div aria-hidden="true" data-scroll-edge="left" className={`${EDGE_FADE_BASE} left-0 bg-gradient-to-r from-bg-base to-transparent ${edges.left ? "opacity-100" : "opacity-0"}`} />
        <div aria-hidden="true" data-scroll-edge="right" className={`${EDGE_FADE_BASE} right-0 bg-gradient-to-l from-bg-base to-transparent ${edges.right ? "opacity-100" : "opacity-0"}`} />
      </div>
    </TableCtx.Provider>
  );
};

export const DataTable = Object.assign(DataTableRoot, {
  Header: DataTableHeader,
  Body: DataTableBody,
});