/**
 * The two TanStack instances behind Market and Free Agents: filtering, the
 * latest-order refs, and the six per-table handlers the JSX binds.
 *
 * Call order inside this hook is load-bearing. The `…IdsRef` / `…ActiveRef`
 * writes happen *after* `useTableDataFor` has derived each table's visible row
 * ids, so the stable palette handlers always read the order the user is
 * looking at. Keep the statements in the order they appear.
 */
import { useCallback, useEffect, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useDataTable, visibleRowIds } from "../table/useDataTable.js";
import { sortDirectionOf } from "../table/features/sorting.js";
import { applyFilters } from "../table/features/filtering.js";
import {
  MARKET_COLUMN_LABELS,
  marketPlayerColumns,
  type MarketPlayerRow,
} from "../table/transfers/marketColumns.js";
import { freeAgentColumns } from "../table/transfers/freeAgentColumns.js";
import type { useTransferTableState } from "../table/transfers/useTransferTableState.js";
import type { SortState, TableId } from "../table/types.js";
import {
  makeTableFocusBookmark,
  resolveTableFocus,
  type TableFocusBookmark,
} from "../table/focusBookmark.js";
import { discardSelectionForNavigation } from "../table/tableState.js";
import { focusIdOf, focusSemanticTarget } from "../focus.js";
import { FREE, MARKET } from "./tableIds.js";

type TransferTableState = ReturnType<typeof useTransferTableState>;
export type PerTableState = TransferTableState["market"];

export interface SelectedPlayer {
  readonly tableId: TableId;
  readonly player: MarketPlayerRow;
}

export interface TransferTablesParams {
  readonly market: PerTableState;
  readonly free: PerTableState;
  readonly marketRows: readonly MarketPlayerRow[];
  readonly freeAgentRows: readonly MarketPlayerRow[];
  readonly selectedRef: React.MutableRefObject<SelectedPlayer | null>;
  readonly setSelected: (next: SelectedPlayer | null) => void;
  readonly selectionChange: (tableId: TableId, playerId: string | null) => void;
  readonly setSortFor: TransferTableState["setSortFor"];
  readonly recordBookmark: TransferTableState["recordBookmark"];
  readonly activeFor: TransferTableState["activeFor"];
  readonly setActiveFor: TransferTableState["setActiveFor"];
  readonly setBookmarkFor: TransferTableState["setBookmarkFor"];
  readonly update: TransferTableState["update"];
  readonly speak: TransferTableState["speak"];
}

export interface TransferTablesValue {
  readonly marketFiltered: readonly MarketPlayerRow[];
  readonly freeFiltered: readonly MarketPlayerRow[];
  readonly marketIds: readonly string[];
  readonly freeIds: readonly string[];
  readonly marketIdsKey: string;
  readonly freeIdsKey: string;
  readonly marketIdsRef: React.MutableRefObject<readonly string[]>;
  readonly freeIdsRef: React.MutableRefObject<readonly string[]>;
  readonly marketActiveRef: React.MutableRefObject<string | null>;
  readonly freeActiveRef: React.MutableRefObject<string | null>;
  readonly onSortChangeFor: (key: TableId) => (next: SortState | null) => void;
  readonly onToggleSelectionFor: (key: TableId) => (id: string) => void;
  readonly onActiveChangeFor: (key: TableId) => (id: string) => void;
  readonly onBookmarkChangeFor: (key: TableId) => (bookmark: TableFocusBookmark) => void;
  readonly onRowPrimaryFor: (key: TableId) => (id: string) => void;
}

export const useTransferTables = ({
  market,
  free,
  marketRows,
  freeAgentRows,
  selectedRef,
  setSelected,
  selectionChange,
  setSortFor,
  recordBookmark,
  activeFor,
  setActiveFor,
  setBookmarkFor,
  update,
  speak,
}: TransferTablesParams): TransferTablesValue => {
  // Latest-order refs for the stable live handlers and sort setters (written
  // after the TanStack instances derive their row ids each render).
  const marketIdsRef = useRef<readonly string[]>([]);
  const freeIdsRef = useRef<readonly string[]>([]);
  const marketActiveRef = useRef<string | null>(null);
  const freeActiveRef = useRef<string | null>(null);

  const marketFiltered = applyFilters(marketRows, market.filters);
  const freeFiltered = applyFilters(freeAgentRows, free.filters);

  const marketTableData = useTableDataFor(
    MARKET,
    marketPlayerColumns(),
    marketFiltered,
    market.sort,
    (next) => setSortFor(MARKET, next),
  );
  const freeTableData = useTableDataFor(
    FREE,
    freeAgentColumns(),
    freeFiltered,
    free.sort,
    (next) => setSortFor(FREE, next),
  );

  const marketIds = marketTableData.rowIds;
  const freeIds = freeTableData.rowIds;
  marketIdsRef.current = marketIds;
  freeIdsRef.current = freeIds;
  marketActiveRef.current = market.active;
  freeActiveRef.current = free.active;
  const marketIdsKey = marketIds.join(",");
  const freeIdsKey = freeIds.join(",");

  const onSortChangeFor = useCallback(
    (key: TableId) => (next: SortState | null) => {
      const ids = key === MARKET ? marketIdsRef.current : freeIdsRef.current;
      recordBookmark(key, ids, activeFor(key));
      setSortFor(key, next);
      if (next === null) {
        speak(key, "sort-cleared", `Cleared the ${key === MARKET ? "Market" : "Free Agents"} sort.`);
      } else {
        speak(
          key,
          "sort-set",
          `Sorted by ${MARKET_COLUMN_LABELS[next.columnId] ?? next.columnId}, ${sortDirectionOf(next.direction)}.`,
        );
      }
    },
    [recordBookmark, setSortFor, activeFor, speak],
  );

  const onToggleSelectionFor = useCallback(
    (key: TableId) => (id: string) => {
      const rows = key === MARKET ? marketRows : freeAgentRows;
      const player = rows.find((p) => p.id === id);
      const name = player !== undefined ? `${player.firstName} ${player.lastName}` : id;
      if (selectedRef.current?.player.id === id) {
        setSelected(null);
        selectionChange(key, null);
        speak(key, "selection", `Deselected ${name}.`);
      } else if (player !== undefined) {
        setSelected({ tableId: key, player });
        selectionChange(key, id);
        speak(key, "selection", `Selected ${name}.`);
      }
    },
    [marketRows, freeAgentRows, selectionChange, speak],
  );

  const onActiveChangeFor = useCallback(
    (key: TableId) => (id: string) => {
      const ids = key === MARKET ? marketIdsRef.current : freeIdsRef.current;
      const bookmark = makeTableFocusBookmark(key, ids, id);
      setActiveFor(key, id);
      if (bookmark !== null) {
        setBookmarkFor(key, bookmark);
        update(key, { focusBookmark: bookmark });
      }
    },
    [marketIdsRef, freeIdsRef, setActiveFor, setBookmarkFor, update],
  );

  const onBookmarkChangeFor = useCallback(
    (key: TableId) => (bookmark: TableFocusBookmark) => {
      setBookmarkFor(key, bookmark);
      update(key, { focusBookmark: bookmark });
    },
    [setBookmarkFor, update],
  );

  const onRowPrimaryFor = useCallback(
    (key: TableId) => (id: string) => {
      const rows = key === MARKET ? marketRows : freeAgentRows;
      const player = rows.find((p) => p.id === id);
      if (player === undefined) return;
      if (selectedRef.current?.player.id !== id) {
        setSelected({ tableId: key, player });
        selectionChange(key, id);
        speak(key, "selection", `Selected ${player.firstName} ${player.lastName}.`);
      }
    },
    [marketRows, freeAgentRows, selectionChange, speak],
  );

  return {
    marketFiltered,
    freeFiltered,
    marketIds,
    freeIds,
    marketIdsKey,
    freeIdsKey,
    marketIdsRef,
    freeIdsRef,
    marketActiveRef,
    freeActiveRef,
    onSortChangeFor,
    onToggleSelectionFor,
    onActiveChangeFor,
    onBookmarkChangeFor,
    onRowPrimaryFor,
  };
};

const useTableDataFor = (
  tableId: TableId,
  columns: ReadonlyArray<ColumnDef<MarketPlayerRow, unknown>>,
  rows: ReadonlyArray<MarketPlayerRow>,
  sort: SortState | null,
  onSortChange: (sort: SortState | null) => void,
): { rowIds: readonly string[] } => {
  const table = useDataTable<MarketPlayerRow>({
    columns,
    data: rows,
    sort,
    onSortChange,
  });
  return { rowIds: visibleRowIds(table) };
};

/** Selection is per-visit: leaving the screen drops it, sort/filters/bookmark survive. */
export const useDiscardTableSelectionOnUnmount = (): void => {
  useEffect(() => {
    return () => {
      discardSelectionForNavigation(MARKET);
      discardSelectionForNavigation(FREE);
    };
  }, []);
};

export interface TransferTableFocusParams {
  readonly viewResultRef: React.MutableRefObject<{ readonly waiting?: boolean }>;
  readonly viewWaiting: boolean | undefined;
  readonly market: PerTableState;
  readonly free: PerTableState;
  readonly marketIds: readonly string[];
  readonly freeIds: readonly string[];
  readonly marketIdsKey: string;
  readonly freeIdsKey: string;
  readonly onActiveChangeFor: (key: TableId) => (id: string) => void;
}

/**
 * Focus restoration (AC-31): when a sort/filter/refetch removes the focused
 * row, restore by stable id with neighbour fallback. Resolves to same → old
 * next → old prev → first visible row → the screen primary.
 */
export const useTransferTableFocusRestoration = ({
  viewResultRef,
  viewWaiting,
  market,
  free,
  marketIds,
  freeIds,
  marketIdsKey,
  freeIdsKey,
  onActiveChangeFor,
}: TransferTableFocusParams): void => {
  const focusRowFor = useCallback(
    (key: TableId, id: string): void => {
      const region = key === MARKET ? "marketTable" : "freeAgentTable";
      (
        document.querySelector(
          `[data-focus-id="${focusIdOf("transfers", region, id)}"]`,
        ) as HTMLElement | null
      )?.focus();
    },
    [],
  );

  const restoreFocusFor = useCallback(
    (
      key: TableId,
      active: string | null,
      bookmark: TableFocusBookmark | null,
      ids: readonly string[],
    ) => {
      if (viewResultRef.current.waiting === true) return;
      if (active === null || ids.includes(active)) return;
      const resolved = resolveTableFocus(
        bookmark !== null && bookmark.tableId === key ? bookmark : null,
        ids,
      );
      if (resolved !== null) {
        onActiveChangeFor(key)(resolved);
        focusRowFor(key, resolved);
      } else {
        focusSemanticTarget({ screen: "transfers" });
      }
    },
    [onActiveChangeFor, focusRowFor, viewResultRef],
  );

  useEffect(() => {
    restoreFocusFor(MARKET, market.active, market.bookmark, marketIds);
  }, [marketIdsKey, viewWaiting, market.active, market.bookmark]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    restoreFocusFor(FREE, free.active, free.bookmark, freeIds);
  }, [freeIdsKey, viewWaiting, free.active, free.bookmark]); // eslint-disable-line react-hooks/exhaustive-deps
};
