/**
 * The squad screen's six persistable session inputs (sort, filters, focus,
 * selection, focus bookmark and horizontal scroll) and their single-source
 * setters. Each setter writes the new value to the live table session
 * (`tableState.ts`) as well as committing it to React state, so the session
 * survives rerenders and screen navigation within a run.
 *
 * Splitting this out of `useSquadScreen` is purely structural: the session is
 * the part of the screen that changes at interaction time but stays put across
 * rerenders, so it composes cleanly beside the data and column concerns.
 */
import { useCallback, useRef, useState } from "react";
import {
  readTableSession,
  updateTableSession,
} from "../table/tableState.js";
import type { TableFocusBookmark } from "../table/focusBookmark.js";
import type { FilterClause, SortState } from "../table/types.js";

const TABLE_ID = "squad";

export interface SquadSessionState {
  readonly sort: SortState | null;
  readonly filters: readonly FilterClause[];
  readonly activeId: string | null;
  readonly selectedId: string | null;
  readonly bookmark: TableFocusBookmark | null;
  readonly scrollLeft: number;
}

export interface SquadSessionActions {
  readonly setSort: (next: SortState | null) => void;
  readonly setFilters: (next: readonly FilterClause[]) => void;
  readonly setSelection: (next: string | null) => void;
  readonly setActiveAndBookmark: (
    id: string | null,
    bookmark: TableFocusBookmark | null,
  ) => void;
  readonly setBookmark: (bookmark: TableFocusBookmark | null) => void;
  readonly commitScroll: (left: number) => void;
}

export const useSquadSession = (): {
  readonly session: SquadSessionState;
  readonly sessionActions: SquadSessionActions;
} => {
  const initialSession = useRef(readTableSession(TABLE_ID));
  const [sort, setSortState] = useState(initialSession.current?.sort ?? null);
  const [filters, setFiltersState] = useState<readonly FilterClause[]>(
    initialSession.current?.filters ?? [],
  );
  const [activeId, setActiveId] = useState<string | null>(
    initialSession.current?.focusBookmark?.itemId ?? null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSession.current?.selectedId ?? null,
  );
  const [bookmark, setBookmarkState] = useState<TableFocusBookmark | null>(
    initialSession.current?.focusBookmark ?? null,
  );
  const [scrollLeft, setScrollLeft] = useState(
    initialSession.current?.scrollLeft ?? 0,
  );

  const setSort = useCallback((next: SortState | null) => {
    setSortState(next);
    updateTableSession(TABLE_ID, { sort: next });
  }, []);
  const setFilters = useCallback((next: readonly FilterClause[]) => {
    setFiltersState(next);
    updateTableSession(TABLE_ID, { filters: next });
  }, []);
  const setSelection = useCallback((next: string | null) => {
    setSelectedId(next);
    updateTableSession(TABLE_ID, { selectedId: next });
  }, []);
  const setActiveAndBookmark = useCallback(
    (next: string | null, nextBookmark: TableFocusBookmark | null) => {
      setActiveId(next);
      setBookmarkState(nextBookmark);
      updateTableSession(TABLE_ID, { focusBookmark: nextBookmark });
    },
    [],
  );
  const setBookmark = useCallback((next: TableFocusBookmark | null) => {
    setBookmarkState(next);
    updateTableSession(TABLE_ID, { focusBookmark: next });
  }, []);
  const commitScroll = useCallback((left: number) => {
    setScrollLeft(left);
    updateTableSession(TABLE_ID, { scrollLeft: left });
  }, []);

  return {
    session: {
      sort,
      filters,
      activeId,
      selectedId,
      bookmark,
      scrollLeft,
    },
    sessionActions: {
      setSort,
      setFilters,
      setSelection,
      setActiveAndBookmark,
      setBookmark,
      commitScroll,
    },
  };
};
