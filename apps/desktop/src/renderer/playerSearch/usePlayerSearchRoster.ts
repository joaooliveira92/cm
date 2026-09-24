/**
 * The Player Search results' table wiring: the shared column set, TanStack instance, and compare
 * selection behind the results list (Screen 119, ticket 11; Screen 129, ticket 12).
 *
 * The results are a committed snapshot of a submitted query, so the only local state is the roving
 * focus (which row is active), the active sort, and the compare selection — a search table is the
 * one read whose manager is actively questioning it, so sorting is on, always on what the rows
 * honestly show. The table's own row *selection* stays off (no single-row action exists); what the
 * Compare column carries is a separate `compareIds` set — not TanStack selection — because the
 * table is rebuilt only when a query commits, and rebuilding it (resetting a roving sort) on a
 * checkbox toggle would make Compare aggravating to assemble. The column reads the set from
 * context (`CompareSelectionContext`) so the memoised shared column set never has to.
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
  readonly compareIds: ReadonlySet<string>;
  readonly onToggleCompare: (id: string) => void;
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
  // Compare membership is ephemeral selection, dropped with the page like any other unsaved
  // filter state: a fresh compare set starts on every visit, and a re-query keeps only rows the
  // new result still contains (the screen filters the set against the committed rows).
  const [compareIds, setCompareIds] = useState<ReadonlySet<string>>(() => new Set());
  const onToggleCompare = useCallback((id: string) => {
    setCompareIds(
      (current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      },
    );
  }, []);
  return {
    table,
    orderedIds,
    activeId,
    sort,
    compareIds,
    onToggleCompare,
    onActiveChange,
    onBookmarkChange,
    onSortChange: setSort,
  };
};