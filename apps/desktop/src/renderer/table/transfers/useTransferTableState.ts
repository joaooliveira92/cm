/**
 * Per-table interaction state for the Transfers screen's two TanStack tables
 * (Market and Free Agents). Each table owns sort, filters, active row, focus
 * bookmark, and announcement — the same 5 fields duplicated in TransfersScreen.
 * This hook consolidates the duplication and owns the session write-through.
 */
import { useCallback, useState } from "react";
import type { FilterClause, SortState, TableAnnouncement, TableId } from "../types.js";
import type { TableFocusBookmark } from "../focusBookmark.js";
import { makeTableFocusBookmark } from "../focusBookmark.js";
import { announce } from "../announcement.js";
import { updateTableSession } from "../tableState.js";

interface TableSeed {
  readonly sort: SortState | null;
  readonly filters: readonly FilterClause[];
  readonly activeId: string | null;
  readonly bookmark: TableFocusBookmark | null;
}

export const useTransferTableState = (
  marketSeed: TableSeed,
  freeSeed: TableSeed,
) => {
  const [marketSort, setMarketSort] = useState<SortState | null>(marketSeed.sort);
  const [marketFilters, setMarketFilters] = useState<readonly FilterClause[]>(marketSeed.filters);
  const [marketActive, setMarketActive] = useState<string | null>(marketSeed.activeId);
  const [marketBookmark, setMarketBookmark] = useState<TableFocusBookmark | null>(marketSeed.bookmark);

  const [freeSort, setFreeSort] = useState<SortState | null>(freeSeed.sort);
  const [freeFilters, setFreeFilters] = useState<readonly FilterClause[]>(freeSeed.filters);
  const [freeActive, setFreeActive] = useState<string | null>(freeSeed.activeId);
  const [freeBookmark, setFreeBookmark] = useState<TableFocusBookmark | null>(freeSeed.bookmark);

  const [marketAnnouncement, setMarketAnnouncement] = useState<TableAnnouncement | null>(null);
  const [freeAnnouncement, setFreeAnnouncement] = useState<TableAnnouncement | null>(null);

  const update = useCallback((key: TableId, patch: Parameters<typeof updateTableSession>[1]): void => {
    updateTableSession(key, patch);
  }, []);

  const speak = useCallback((tableId: TableId, eventId: string, message: string) => {
    if (!announce({ tableId, eventId, message })) return;
    const line = { tableId, eventId, message };
    if (tableId === "transfer-market") setMarketAnnouncement(line);
    else setFreeAnnouncement(line);
  }, []);

  const recordBookmark = useCallback(
    (key: TableId, ids: readonly string[], focusId: string | null): void => {
      const before = makeTableFocusBookmark(key, ids, focusId);
      if (before === null) return;
      if (key === "transfer-market") setMarketBookmark(before);
      else setFreeBookmark(before);
      update(key, { focusBookmark: before });
    },
    [update],
  );

  const setSortFor = useCallback(
    (key: TableId, next: SortState | null) => {
      if (key === "transfer-market") setMarketSort(next);
      else setFreeSort(next);
      update(key, { sort: next });
    },
    [update],
  );

  const setFiltersFor = useCallback(
    (key: TableId, next: readonly FilterClause[]) => {
      if (key === "transfer-market") setMarketFilters(next);
      else setFreeFilters(next);
      update(key, { filters: next });
    },
    [update],
  );

  const filtersFor = useCallback(
    (key: TableId): readonly FilterClause[] =>
      key === "transfer-market" ? marketFilters : freeFilters,
    [marketFilters, freeFilters],
  );

  const activeFor = useCallback(
    (key: TableId): string | null =>
      key === "transfer-market" ? marketActive : freeActive,
    [marketActive, freeActive],
  );

  const setActiveFor = useCallback(
    (key: TableId, id: string) => {
      if (key === "transfer-market") setMarketActive(id);
      else setFreeActive(id);
    },
    [],
  );

  const setBookmarkFor = useCallback(
    (key: TableId, bookmark: TableFocusBookmark) => {
      if (key === "transfer-market") setMarketBookmark(bookmark);
      else setFreeBookmark(bookmark);
    },
    [],
  );

  return {
    market: { sort: marketSort, filters: marketFilters, active: marketActive, bookmark: marketBookmark, announcement: marketAnnouncement },
    free: { sort: freeSort, filters: freeFilters, active: freeActive, bookmark: freeBookmark, announcement: freeAnnouncement },
    setSortFor,
    setFiltersFor,
    filtersFor,
    activeFor,
    setActiveFor,
    setBookmarkFor,
    recordBookmark,
    speak,
    update,
  } as const;
};
