/**
 * The semantic `<table>` renderer (note: Navigation model, AC-28). Row-oriented
 * roving on a native table — NO ARIA grid. One focusable control per row: the
 * player-name button (never a bare `<tr tabindex=0>`). Sortable headers are
 * native `<button>`s in Tab order with `aria-sort` and a visible SortIndicator.
 * ArrowUp/Down rove, Home/End jump to the ends, Space toggles selection (focus
 * and selection are separate), Enter runs the row's primary action, Tab moves
 * in/out of the sequence, and Shift+Arrow scrolls horizontally (Squad only).
 *
 * It also owns the dense-table visuals (note: dense table visuals and the
 * player-status vocabulary): the pinned columns' sticky offsets and opaque
 * fills, and the scroll-position-driven edge fade that signals there are more
 * columns beyond the visible width. Row density, header treatment and the
 * hover/selection fills live one level down, in `components/ui/table.tsx`.
 */
import { flexRender } from "@tanstack/react-table";
import type { Table as TanStackTable } from "@tanstack/react-table";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Alert } from "../components/ui/alert.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { FOCUS_RING, focusIdOf, rovingTabIndex } from "../focus.js";
import type { SortState, TableRowShape } from "./types.js";
import type { TableFocusBookmark } from "./focusBookmark.js";
import { cycleSort } from "./features/sorting.js";

const HORIZONTAL_SCROLL_STEP = 120;

/** Sub-pixel scroll offsets (trackpads, zoom) never land exactly on the ends. */
const EDGE_EPSILON = 1;

/** Which horizontal edges have content hidden beyond them. Pure so the fade's
 *  rule is testable without a layout engine. */
export interface ScrollEdges {
  readonly left: boolean;
  readonly right: boolean;
}

export const scrollEdges = (metrics: {
  readonly scrollLeft: number;
  readonly scrollWidth: number;
  readonly clientWidth: number;
}): ScrollEdges => {
  const overflow = metrics.scrollWidth - metrics.clientWidth;
  return {
    left: metrics.scrollLeft > EDGE_EPSILON,
    right: overflow > EDGE_EPSILON && metrics.scrollLeft < overflow - EDGE_EPSILON,
  };
};

const EDGE_FADE_BASE =
  "pointer-events-none absolute inset-y-0 w-8 transition-opacity duration-150";

/** The identity column's aria label when no row is focused: first visible row. */
export const effectiveActiveId = (activeId: string | null, ids: readonly string[]): string | null =>
  activeId ?? (ids.length > 0 ? ids[0]! : null);

export interface DataTableProps<Row extends TableRowShape> {
  readonly tableId: TableFocusBookmark["tableId"];
  /** `data-focus-id` prefix (the screen id: "squad" | "transfers"). */
  readonly screen: string;
  /** `data-focus-id` region (e.g. "squadTable" | "marketTable"). */
  readonly region: string;
  readonly table: TanStackTable<Row>;
  /** The visible rows in TanStack's derived order (roving universe). */
  readonly orderedIds: readonly string[];
  /** The column rendered as the per-row focus button (the player name). */
  readonly identityColumnId: string;
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
  readonly selectedId: string | null;
  readonly onToggleSelection: (id: string) => void;
  /** Sort change request (already-cycled: asc → desc → none). */
  readonly onSortChange: (sort: SortState | null) => void;
  /** `true` when rows exist and a background refresh is in flight (aria-busy). */
  readonly busy: boolean;
  /** Horizontal Shift+Arrow scroll region (Squad only). */
  readonly enableShiftScroll?: boolean;
  /** The row primary action (Enter). Default: nothing beyond selection. */
  readonly onRowPrimary?: (id: string) => void;
  /** The table region's accessible name (header text). */
  readonly ariaLabel: string;
  /** The deduplicated line for the one polite status announcer of this table. */
  readonly announcement: string;
  /** Optional extra region (blocking errors — `role="alert"`). */
  readonly alertMessage?: string;
  /** Initial horizontal scroll offset restored on mount (Squad Shift+Arrow). */
  readonly initialScrollLeft?: number;
  /** Reports a Shift+Arrow horizontal scroll commit (session persistence). */
  readonly onScrollCommit?: (scrollLeft: number) => void;
}

export const DataTable = <Row extends TableRowShape>(props: DataTableProps<Row>) => {
  const {
    table,
    orderedIds,
    identityColumnId,
    activeId,
    onActiveChange,
    onBookmarkChange,
    selectedId,
    onToggleSelection,
    onSortChange,
    busy,
    enableShiftScroll,
    onRowPrimary,
    ariaLabel,
    announcement,
    alertMessage,
    initialScrollLeft,
    onScrollCommit,
  } = props;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<ScrollEdges>({ left: false, right: false });

  // The edge fade is driven by scroll position, not by a persistent "more
  // columns" affordance: it appears on the side that has content hidden and
  // disappears at each end. Re-measured on scroll and after every render that
  // can change the widths (column visibility, row count, resize).
  const syncEdges = useCallback((): void => {
    const container = scrollRef.current;
    if (container === null) return;
    setEdges(scrollEdges(container));
  }, []);

  // Restore the session's scroll offset on mount (Squad horizontal scroll
  // survives screen navigation; save reload resets it to zero).
  useLayoutEffect(() => {
    if (scrollRef.current !== null && initialScrollLeft !== undefined) {
      scrollRef.current.scrollLeft = initialScrollLeft;
    }
  }, [initialScrollLeft]);

  const rows = table.getRowModel().rows;

  useLayoutEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges, rows.length, table.getVisibleFlatColumns().length]);
  const effectiveActive = effectiveActiveId(activeId, orderedIds);

  const cycleSortHeader = (columnId: string): void => {
    // Re-derive the current controlled SortState from TanStack's mutable sort
    // table and delegate the asc → desc → none law to the one implementation.
    const current = table.getState().sorting[0];
    const currentSort: SortState | null =
      current === undefined
        ? null
        : { columnId: current.id, direction: current.desc ? "desc" : "asc" };
    onSortChange(cycleSort(currentSort, columnId));
  };

  const focusRow = (id: string): void => {
    (
      document.querySelector(
        `[data-focus-id="${focusIdOf(props.screen, props.region, id)}"]`,
      ) as HTMLElement | null
    )?.focus();
  };

  const moveFocus = (delta: 1 | -1): void => {
    if (orderedIds.length === 0) return;
    const idx = orderedIds.indexOf(effectiveActive ?? "");
    const base = idx === -1 ? (delta === 1 ? 0 : orderedIds.length - 1) : (idx + delta + orderedIds.length) % orderedIds.length;
    const next = orderedIds[base]!;
    recordBookmark(next);
    onActiveChange(next);
    focusRow(next);
  };

  const recordBookmark = (next: string): void => {
    const index = orderedIds.indexOf(next);
    onBookmarkChange({
      tableId: props.tableId,
      itemId: next,
      previousItemId: orderedIds[index - 1],
      nextItemId: orderedIds[index + 1],
    });
  };

  const jumpTo = (next: string): void => {
    recordBookmark(next);
    onActiveChange(next);
    focusRow(next);
  };

  const onBodyKeyDown = (event: React.KeyboardEvent): void => {
    if (enableShiftScroll === true && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const container = scrollRef.current;
      if (container !== null) {
        const nextLeft = Math.max(
          0,
          container.scrollLeft + (event.key === "ArrowRight" ? 1 : -1) * HORIZONTAL_SCROLL_STEP,
        );
        container.scrollLeft = nextLeft;
        onScrollCommit?.(container.scrollLeft);
        syncEdges();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-1);
        break;
      case "Home": {
        event.preventDefault();
        const first = orderedIds[0];
        if (first !== undefined) jumpTo(first);
        break;
      }
      case "End": {
        event.preventDefault();
        const last = orderedIds[orderedIds.length - 1];
        if (last !== undefined) jumpTo(last);
        break;
      }
      case " ": {
        // Space toggles selection on the current row; focus ≠ selection.
        event.preventDefault();
        if (effectiveActive !== null) onToggleSelection(effectiveActive);
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (effectiveActive !== null) {
          onRowPrimary?.(effectiveActive);
        }
        break;
      }
    }
  };

  return (
    <div className="relative">
    <div
      data-table-scroll
      ref={scrollRef}
      className="mt-2 overflow-x-auto"
      aria-busy={busy || undefined}
      role="group"
      aria-label={ariaLabel}
      onScroll={syncEdges}
    >
      {/* The <table> only mounts when rows exist; the group + status region
          wrapper is rendered in every non-blocking state so the polite
          announcer survives a transition to zero rows (F3). */}
      {rows.length > 0 && (
        <Table className="min-w-full text-left">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-panel-border hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sortable && sortState === "asc" ? "ascending" : sortable && sortState === "desc" ? "descending" : undefined}
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
                          <span aria-hidden="true" className="text-[0.65rem] text-text-secondary">
                            {sortState === "asc" ? "▲" : sortState === "desc" ? "▼" : "↕"}
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
          <TableBody onKeyDown={onBodyKeyDown}>
            {rows.map((row) => {
              const id = row.original.id;
              const isIdentity = (columnId: string): boolean => columnId === identityColumnId;
              return (
                // `group` lets the pinned cells below pick up the row's hover
                // and selection states; they cannot inherit the row's fill
                // because a sticky cell must paint its own opaque background.
                <TableRow key={id} className="group" aria-selected={selectedId === id || undefined}>
                  {row.getVisibleCells().map((cell) => {
                    const cellClass = `whitespace-nowrap ${
                      cell.column.getIsPinned() === false ? "" : PINNED_CELL_CLASS
                    }`;
                    const style = pinnedStyle(cell.column);
                    if (isIdentity(cell.column.id)) {
                      return (
                        <TableCell key={cell.id} className={`overflow-hidden text-ellipsis ${cellClass}`} style={style}>
                          <button
                            type="button"
                            data-focus-id={focusIdOf(props.screen, props.region, id)}
                            tabIndex={rovingTabIndex(effectiveActive, id)}
                            onFocus={() => {
                              if (activeId !== id) onActiveChange(id);
                            }}
                            onClick={() => {
                              onToggleSelection(id);
                            }}
                            className={`whitespace-nowrap font-semibold text-text-primary ${FOCUS_RING.join(" ")}`}
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
        </Table>
      )}
      {/* One polite status announcer per table (AC-32): always in the DOM, its
          text is the deduplicated line `announce` already admitted. */}
      <div role="status" aria-live="polite">
        {announcement}
      </div>
      {alertMessage !== undefined && (
        <Alert variant="destructive" className="mt-2">
          {alertMessage}
        </Alert>
      )}
    </div>
      {/* The overflow edges. Decorative: the columns themselves are already in
          the accessibility tree and reachable by Tab, so nothing here is
          announced. */}
      <div
        aria-hidden="true"
        data-scroll-edge="left"
        className={`${EDGE_FADE_BASE} left-0 bg-gradient-to-r from-bg-base to-transparent ${edges.left ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden="true"
        data-scroll-edge="right"
        className={`${EDGE_FADE_BASE} right-0 bg-gradient-to-l from-bg-base to-transparent ${edges.right ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
};

/** Pinned cells paint an opaque background (they overlap the columns scrolling
 *  beneath) and take the row's hover/selection fill from the row's `group`. */
const PINNED_CELL_CLASS =
  "bg-bg-base group-hover:bg-row-hover group-aria-selected:bg-row-selected!";

/**
 * The sticky placement of a pinned column: its left offset is the summed width
 * of the pinned columns before it, which is exact only because every pinned
 * column declares a fixed `size`. Unpinned columns get no inline style.
 */
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