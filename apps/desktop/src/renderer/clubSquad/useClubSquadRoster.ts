/**
 * The any-club squad's table wiring: the shared column set and TanStack instance behind the bare
 * roster (`ClubSquadScreen`), so the club-scoped screen and the own-club lineup manager render
 * the SAME columns and cells — the one row/table implementation (`SquadRoster`) — with the
 * editing surface absent.
 *
 * The roster is a read, so the only state is the roving focus (which row is active); sort and
 * selection are off by construction — the columns are built `sortable: false` and the screen
 * passes no selected row — and nothing is persisted: a foreign club's rows carry no bookmark
 * across navigation.
 */
import { useCallback, useMemo, useState } from "react";
import { squadColumns, type SquadRow } from "../table/squad/squadColumns.js";
import { useDataTable, visibleRowIds } from "../table/useDataTable.js";
import type { TableFocusBookmark } from "../table/focusBookmark.js";

export const useClubSquadRoster = (
  rows: ReadonlyArray<SquadRow>,
): {
  readonly table: ReturnType<typeof useDataTable<SquadRow>>;
  readonly orderedIds: readonly string[];
  readonly activeId: string | null;
  readonly onActiveChange: (id: string) => void;
  readonly onBookmarkChange: (bookmark: TableFocusBookmark) => void;
} => {
  const [activeId, setActiveId] = useState<string | null>(null);
  // The bare set: no Status / Condition / Training Focus columns (the fields a rival's read does
  // not carry) and no sort controls. Built once — TanStack keys its memos on `columns` identity.
  const columns = useMemo(() => squadColumns({ ownClub: false, sortable: false }), []);
  const table = useDataTable<SquadRow>({
    columns,
    data: rows,
    sort: null,
    onSortChange: () => undefined,
    pinnedColumnIds: ["name"],
  });
  const orderedIds = visibleRowIds(table);
  const onActiveChange = useCallback((id: string) => setActiveId(id), []);
  const onBookmarkChange = useCallback((_bookmark: TableFocusBookmark) => {}, []);
  return { table, orderedIds, activeId, onActiveChange, onBookmarkChange };
};