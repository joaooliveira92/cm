/**
 * The semantic `<table>` renderer (note: Navigation model, AC-28). Row-oriented
 * roving on a native table — NO ARIA grid. One focusable control per row: the
 * player-name button (never a bare `<tr tabindex=0>`). Sortable headers are
 * native `<button>`s in Tab order with `aria-sort` and a visible SortIndicator.
 * ArrowUp/Down rove, Home/End jump to the ends, Space toggles selection (focus
 * and selection are separate), Enter runs the row's primary action, Tab moves
 * in/out of the sequence, and Shift+Arrow scrolls horizontally (Squad only).
 */
import { flexRender } from "@tanstack/react-table";
import type { Table } from "@tanstack/react-table";
import { useLayoutEffect, useRef } from "react";
import { FOCUS_RING, focusIdOf, rovingTabIndex } from "../focus.js";
import type { SortState, TableRowShape } from "./types.js";
import type { TableFocusBookmark } from "./focusBookmark.js";
import { cycleSort } from "./features/sorting.js";

const HORIZONTAL_SCROLL_STEP = 120;

/** The identity column's aria label when no row is focused: first visible row. */
export const effectiveActiveId = (activeId: string | null, ids: readonly string[]): string | null =>
  activeId ?? (ids.length > 0 ? ids[0]! : null);

export interface DataTableProps<Row extends TableRowShape> {
  readonly tableId: TableFocusBookmark["tableId"];
  /** `data-focus-id` prefix (the screen id: "squad" | "transfers"). */
  readonly screen: string;
  /** `data-focus-id` region (e.g. "squadTable" | "marketTable"). */
  readonly region: string;
  readonly table: Table<Row>;
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

  // Restore the session's scroll offset on mount (Squad horizontal scroll
  // survives screen navigation; save reload resets it to zero).
  useLayoutEffect(() => {
    if (scrollRef.current !== null && initialScrollLeft !== undefined) {
      scrollRef.current.scrollLeft = initialScrollLeft;
    }
  }, [initialScrollLeft]);

  const rows = table.getRowModel().rows;
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
    <div
      data-table-scroll
      ref={scrollRef}
      className="mt-2 overflow-x-auto"
      aria-busy={busy || undefined}
      role="group"
      aria-label={ariaLabel}
    >
      {/* The <table> only mounts when rows exist; the group + status region
          wrapper is rendered in every non-blocking state so the polite
          announcer survives a transition to zero rows (F3). */}
      {rows.length > 0 && (
        <table className="min-w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-700 text-slate-400">
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  const pinned = header.column.getIsPinned();
                  const headerStyle: React.CSSProperties | undefined =
                    pinned !== false ? { position: "sticky", left: 0, zIndex: 1 } : undefined;
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <th
                      key={header.id}
                      aria-sort={sortable && sortState === "asc" ? "ascending" : sortable && sortState === "desc" ? "descending" : undefined}
                      className="py-1 pr-4 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={headerStyle}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          className={`flex items-center gap-1 ${FOCUS_RING.join(" ")}`}
                          onClick={() => cycleSortHeader(header.column.id)}
                        >
                          <span>{label}</span>
                          <span aria-hidden="true" className="text-[0.65rem]">
                            {sortState === "asc" ? "▲" : sortState === "desc" ? "▼" : "↕"}
                          </span>
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody onKeyDown={onBodyKeyDown}>
            {rows.map((row) => {
              const id = row.original.id;
              const isIdentity = (columnId: string): boolean => columnId === identityColumnId;
              return (
                <tr
                  key={id}
                  aria-selected={selectedId === id || undefined}
                  className="border-b border-slate-800"
                >
                  {row.getVisibleCells().map((cell) => {
                    const pinned = cell.column.getIsPinned();
                    const style: React.CSSProperties | undefined =
                      pinned !== false
                        ? { position: "sticky", left: 0, background: "rgb(2 6 23)" }
                        : undefined;
                    if (isIdentity(cell.column.id)) {
                      return (
                        <td key={cell.id} className="py-1 pr-4 whitespace-nowrap" style={style}>
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
                            className={`whitespace-nowrap font-semibold text-slate-100 ${FOCUS_RING.join(" ")}`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={cell.id} className="py-1 pr-4 whitespace-nowrap" style={style}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {/* One polite status announcer per table (AC-32): always in the DOM, its
          text is the deduplicated line `announce` already admitted. */}
      <div role="status" aria-live="polite">
        {announcement}
      </div>
      {alertMessage !== undefined && (
        <div role="alert" className="mt-2 rounded border border-red-800 bg-red-950/40 p-2 text-sm text-red-300">
          {alertMessage}
        </div>
      )}
    </div>
  );
};