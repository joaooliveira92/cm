import type { RefObject } from "react";
import type { Table as TanStackTable } from "@tanstack/react-table";
import { focusIdOf } from "../focus.js";
import { cycleSort } from "./features/sorting.js";
import type { TableFocusBookmark } from "./focusBookmark.js";
import type { SortState, TableRowShape } from "./types.js";

const HORIZONTAL_SCROLL_STEP = 120;

export const effectiveActiveId = (
  activeId: string | null,
  ids: readonly string[],
): string | null => activeId ?? (ids.length > 0 ? ids[0]! : null);

export interface UseTableKeyboardInput {
  readonly orderedIds: readonly string[];
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
  readonly onToggleSelection: (id: string) => void;
  readonly onRowPrimary?: (id: string) => void;
  readonly screen: string;
  readonly region: string;
  readonly tableId: TableFocusBookmark["tableId"];
  readonly onSortChange: (sort: SortState | null) => void;
  readonly table: TanStackTable<TableRowShape>;
  readonly shiftScrollRef?: RefObject<HTMLDivElement | null>;
  readonly onShiftScrollCommit?: (scrollLeft: number) => void;
}

export const useTableKeyboard = (input: UseTableKeyboardInput) => {
  const {
    orderedIds,
    activeId,
    onActiveChange,
    onBookmarkChange,
    onToggleSelection,
    onRowPrimary,
    screen,
    region,
    tableId,
    onSortChange,
    table,
    shiftScrollRef,
    onShiftScrollCommit,
  } = input;

  const effectiveActive = effectiveActiveId(activeId, orderedIds);

  const onBodyKeyDown = (event: React.KeyboardEvent): void => {
    if (
      shiftScrollRef !== undefined &&
      event.shiftKey &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      const container = shiftScrollRef.current;
      if (container !== null) {
        const nextLeft = Math.max(
          0,
          container.scrollLeft +
            (event.key === "ArrowRight" ? 1 : -1) * HORIZONTAL_SCROLL_STEP,
        );
        container.scrollLeft = nextLeft;
        onShiftScrollCommit?.(container.scrollLeft);
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

  const focusRow = (id: string): void => {
    (
      document.querySelector(
        `[data-focus-id="${focusIdOf(screen, region, id)}"]`,
      ) as HTMLElement | null
    )?.focus();
  };

  const recordBookmark = (next: string): void => {
    const index = orderedIds.indexOf(next);
    onBookmarkChange({
      tableId,
      itemId: next,
      previousItemId: orderedIds[index - 1],
      nextItemId: orderedIds[index + 1],
    });
  };

  const moveFocus = (delta: 1 | -1): void => {
    if (orderedIds.length === 0) return;
    const idx = orderedIds.indexOf(effectiveActive ?? "");
    const base =
      idx === -1
        ? delta === 1
          ? 0
          : orderedIds.length - 1
        : (idx + delta + orderedIds.length) % orderedIds.length;
    const next = orderedIds[base]!;
    recordBookmark(next);
    onActiveChange(next);
    focusRow(next);
  };

  const jumpTo = (next: string): void => {
    recordBookmark(next);
    onActiveChange(next);
    focusRow(next);
  };

  return { onBodyKeyDown, effectiveActive };
};