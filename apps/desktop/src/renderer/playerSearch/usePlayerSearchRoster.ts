/**
 * The Player Search results' table wiring: the shared column set and TanStack instance behind the
 * results list (Screen 119, ticket 11).
 *
 * The results are a committed snapshot of a submitted query, so the only local state is the roving
 * focus (which row is active) and the active sort — a search table is the one read whose manager
 * is actively questioning it, so sorting is on, always on what the rows honestly show. Selection is
 * off by construction: nothing on this screen acts on more than one player at once.
 */
import { useCallback, useMemo, useState } from "react";
import { searchColumns, type SearchRow } from "../table/playerSearch/searchColumns.js";
import { useDataTable, visibleRowIds } from "../table/useDataTable.js";
import type { TableFocusBookmark } from "../table/focusBookmark.js";
import type { SortState } from "../table/types.js";

export const usePlayerSearchRoster = (
  rows: ReadonlyArray<SearchRow>,
): {
  readonly table: ReturnType<typeof useDataTable<SearchRow>>;
  readonly orderedIds: readonly string[];
  readonly activeId: string | null;
  readonly sort: SortState | null;
  readonly onActiveChange: (id: string) => void;
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
  readonly onSortChange: (sort: SortState | null) => void;
} => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  // Built once — TanStack keys its memos on `columns` identity (see `marketColumns`).
  const columns = useMemo(() => searchColumns(true), []);
  const table = useDataTable<SearchRow>({
    columns,
    data: rows,
    sort,
    onSortChange: setSort,
    pinnedColumnIds: ["name"],
  });
  const orderedIds = visibleRowIds(table);
  const onActiveChange = useCallback((id: string) => setActiveId(id), []);
  // A search's rows are not restorable: the query is re-run and the page rebuilt, so there is no
  // bookmark to carry across a sort — the same decision the bare any-club roster makes.
  const onBookmarkChange = useCallback((_bookmark: TableFocusBookmark) => {}, []);
  return {
    table,
    orderedIds,
    activeId,
    sort,
    onActiveChange,
    onBookmarkChange,
    onSortChange: setSort,
  };
};