/**
 * Squad screen state hook — all useState, useEffect, useCallback, and derived
 * state for the squad table lives here. The provider publishes it through context;
 * the view components consume it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SaveId } from "@cm-clone/contracts";
import { Option } from "effect";
import {
  AsyncResult,
  describeRpcError,
  squadAtom,
  typedError,
  useAtomRefresh,
  useAtomValue,
} from "../rpc.js";
import { registerActionHandler } from "../actions/dispatch.js";
import { focusIdOf } from "../focus.js";
import { SQUAD_PALETTE_OPTIONS, tableSortAndFilterActions } from "../table/paletteActions.js";
import {
  SQUAD_COLUMN_LABELS,
  squadColumns,
  squadRowOf,
  type SquadRow,
} from "../table/squad/squadColumns.js";
import { useDataTable, visibleRowIds } from "../table/useDataTable.js";
import type { Table } from "@tanstack/react-table";
import { classifyTableParamAction } from "../table/paramActions.js";
import { sortDirectionOf } from "../table/features/sorting.js";
import {
  applyFilters,
  clearFilters,
  positionClause,
  upsertFilter,
} from "../table/features/filtering.js";
import {
  SQUAD_ALL_COLUMN_IDS,
  SQUAD_PRESETS,
  toggleColumn,
  type SquadPresetId,
} from "../table/features/visibility.js";
import { statusTermsOf } from "../table/squad/playerStatus.js";
import {
  loadSquadColumnPreferences,
  resetSquadColumnPreferences,
  saveSquadColumnPreferences,
  type SquadColumnPreferences,
} from "../table/columnPreferences.js";
import {
  discardSelectionForNavigation,
  readTableSession,
  updateTableSession,
} from "../table/tableState.js";
import {
  makeTableFocusBookmark,
  resolveTableFocus,
  type TableFocusBookmark,
} from "../table/focusBookmark.js";
import { announce } from "../table/announcement.js";
import {
  deriveRefreshState,
  deriveViewState,
  STATE_COPY,
  type TableStateCopy,
} from "../table/viewState.js";
import type { FilterClause, SortState, TableAnnouncement } from "../table/types.js";

const TABLE_ID = "squad";

export interface SquadScreenState {
  readonly allPlayers: ReadonlyArray<SquadRow>;
  readonly filtered: ReadonlyArray<SquadRow>;
  readonly sort: SortState | null;
  readonly filters: readonly FilterClause[];
  readonly activeId: string | null;
  readonly selectedId: string | null;
  readonly bookmark: TableFocusBookmark | null;
  readonly scrollLeft: number;
  readonly legendExpanded: boolean;
  readonly preferences: SquadColumnPreferences;
  readonly announcement: TableAnnouncement | null;
  readonly viewState: ReturnType<typeof deriveViewState>;
  readonly refreshState: ReturnType<typeof deriveRefreshState>;
  readonly copy: TableStateCopy;
  readonly orderedIds: readonly string[];
  readonly table: Table<SquadRow>;
}

export interface SquadScreenActions {
  readonly setSort: (next: SquadScreenState["sort"]) => void;
  readonly setFilters: (next: readonly FilterClause[]) => void;
  readonly setSelection: (next: string | null) => void;
  readonly setActiveAndBookmark: (id: string | null, bookmark: TableFocusBookmark | null) => void;
  readonly setBookmark: (bookmark: TableFocusBookmark | null) => void;
  readonly commitScroll: (left: number) => void;
  readonly applyPreferences: (next: SquadColumnPreferences) => void;
  readonly setLegendExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  readonly onSortCycle: (next: SquadScreenState["sort"]) => void;
  readonly onToggleSelection: (id: string) => void;
  readonly onActiveChange: (id: string) => void;
  readonly onRowPrimary: (id: string) => void;
  readonly setPositionFilter: (position: string) => void;
  readonly setPreset: (presetId: SquadPresetId) => void;
  readonly toggleOneColumn: (columnId: string) => void;
  readonly clearFilterCommand: () => void;
  readonly clearSortCommand: () => void;
  readonly refreshSquad: () => void;
}

export interface SquadScreenMeta {
  readonly saveId: SaveId;
  readonly speak: (eventId: string, message: string) => void;
  readonly TABLE_ID: string;
  readonly STATUS_LEGEND_ID: string;
  readonly allPlayers: ReadonlyArray<SquadRow>;
}

export interface SquadScreenValue {
  readonly state: SquadScreenState;
  readonly actions: SquadScreenActions;
  readonly meta: SquadScreenMeta;
}

const REGION = "squadTable";
const STATUS_LEGEND_ID = "squad-status-legend";

export const useSquadScreen = (saveId: SaveId): SquadScreenValue => {
  const squadResult = useAtomValue(squadAtom(saveId));
  const refreshSquad = useAtomRefresh(squadAtom(saveId));

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
  const [scrollLeft, setScrollLeft] = useState(initialSession.current?.scrollLeft ?? 0);

  const setSort = useCallback((next: typeof sort) => {
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

  const [legendExpanded, setLegendExpanded] = useState(false);

  const [preferences, setPreferences] = useState<SquadColumnPreferences>(() =>
    loadSquadColumnPreferences(),
  );
  const applyPreferences = useCallback((next: SquadColumnPreferences) => {
    setPreferences(next);
    saveSquadColumnPreferences(next);
  }, []);

  const latest = useRef({
    sort,
    filters,
    activeId,
    bookmark,
    players: [] as ReadonlyArray<SquadRow>,
  });
  latest.current.sort = sort;
  latest.current.filters = filters;
  latest.current.activeId = activeId;
  latest.current.bookmark = bookmark;

  const [announcement, setAnnouncement] = useState<TableAnnouncement | null>(null);
  const speak = useCallback((eventId: string, message: string) => {
    if (announce({ tableId: TABLE_ID, eventId, message })) {
      setAnnouncement({ tableId: TABLE_ID, eventId, message });
    }
  }, []);

  const error = typedError(squadResult);
  const view = Option.getOrUndefined(AsyncResult.value(squadResult));
  const allPlayers = (view !== undefined ? view.players : []).map(squadRowOf);
  latest.current.players = allPlayers;

  const blockingFailure = error !== null && view === undefined;
  const filtered = applyFilters(allPlayers, filters);
  const viewState = deriveViewState({
    status: blockingFailure ? "failure" : view !== undefined ? "success" : "loading",
    errorMessage: error !== null ? describeRpcError(error) : "Failed to load the squad.",
    totalRows: allPlayers.length,
    visibleRows: filtered.length,
    filters,
  });
  const refreshState = deriveRefreshState({
    waiting: squadResult.waiting === true && view !== undefined,
    refreshFailed:
      error !== null && view !== undefined ? { message: describeRpcError(error) } : null,
  });

  const copy: TableStateCopy = STATE_COPY.squad;

  // TanStack keys its internal memos on the identity of `columns` and `columnVisibility`. Rebuilt
  // inline on every render, they invalidated every column, row, and cell object each pass — the
  // allocation churn behind the renderer's GC load. `legendExpanded` is the only real input.
  const toggleLegend = useCallback(() => setLegendExpanded((open) => !open), []);
  const columns = useMemo(
    () =>
      squadColumns({
        expanded: legendExpanded,
        legendId: STATUS_LEGEND_ID,
        onToggle: toggleLegend,
      }),
    [legendExpanded, toggleLegend],
  );
  const columnVisibility = useMemo(
    () =>
      Object.fromEntries(
        SQUAD_ALL_COLUMN_IDS.map((columnId) => [
          columnId,
          preferences.visibleColumnIds.includes(columnId),
        ]),
      ),
    [preferences.visibleColumnIds],
  );
  const table = useDataTable<SquadRow>({
    columns,
    data: filtered,
    sort,
    onSortChange: setSort,
    columnVisibility,
    pinnedColumnIds: preferences.pinnedColumnIds,
  });

  const orderedIds = visibleRowIds(table);

  const focusRow = useCallback((id: string): void => {
    (
      document.querySelector(
        `[data-focus-id="${focusIdOf("squad", REGION, id)}"]`,
      ) as HTMLElement | null
    )?.focus();
  }, []);

  const recordBookmark = useCallback(
    (ids: readonly string[], focusId: string | null): void => {
      const before = makeTableFocusBookmark(TABLE_ID, ids, focusId);
      if (before !== null) setBookmark(before);
    },
    [setBookmark],
  );

  const applySort = useCallback(
    (nextSort: typeof sort, announceLabel?: string) => {
      setSort(nextSort);
      const verb = announceLabel;
      if (verb !== undefined) speak("sort-set", verb);
    },
    [setSort, speak],
  );

  const applyFilter = useCallback(
    (next: readonly FilterClause[]) => {
      setFilters(next);
      const count = applyFilters(latest.current.players, next).length;
      speak("filter-set", `${count} ${count === 1 ? "player matches" : "players match"} the current filters.`);
    },
    [setFilters, speak],
  );

  const clearFilterCommand = useCallback(() => {
    setFilters(clearFilters());
    speak("filter-cleared", `Cleared the filters. ${allPlayers.length} ${allPlayers.length === 1 ? "player is" : "players are"} shown.`);
  }, [setFilters, speak, allPlayers.length]);

  const clearSortCommand = useCallback(() => {
    setSort(null);
    speak("sort-cleared", "Cleared the Squad sort.");
  }, [setSort, speak]);

  useEffect(() => {
    const unregisters: Array<() => void> = [];
    for (const action of tableSortAndFilterActions(SQUAD_PALETTE_OPTIONS)) {
      unregisters.push(
        registerActionHandler(action.id, (params: unknown) => {
          const parsed = classifyTableParamAction(action.id, params);
          if (parsed === null || parsed.tableId !== TABLE_ID) return;
          recordBookmark(orderedIdsRef.current, latest.current.activeId);
          switch (parsed.kind) {
            case "set-sort": {
              const nextSort = parsed.sort ?? null;
              const verb =
                nextSort === null
                  ? undefined
                  : `Sorted by ${SQUAD_COLUMN_LABELS[nextSort.columnId] ?? nextSort.columnId}, ${sortDirectionOf(nextSort.direction)}.`;
              applySort(nextSort, verb);
              break;
            }
            case "clear-sort":
              clearSortCommand();
              break;
            case "set-filter":
              if (parsed.filter !== undefined) applyFilter(upsertFilter(latest.current.filters, parsed.filter));
              break;
            case "clear-filters":
              clearFilterCommand();
              break;
          }
        }),
      );
    }
    unregisters.push(
      registerActionHandler("retry-squad-table", () => {
        refreshSquad();
      }),
    );
    unregisters.push(
      registerActionHandler("restore-squad-columns", () => {
        const restored = resetSquadColumnPreferences();
        applyPreferences(restored);
        speak("columns-restored", "Restored the default Squad columns.");
      }),
    );
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [saveId]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedIdsRef = useRef(orderedIds);
  orderedIdsRef.current = orderedIds;

  const onSortCycle = useCallback(
    (next: typeof sort) => {
      recordBookmark(orderedIds, activeId);
      const verb =
        next === null
          ? undefined
          : `Sorted by ${SQUAD_COLUMN_LABELS[next.columnId] ?? next.columnId}, ${sortDirectionOf(next.direction)}.`;
      applySort(next, verb);
    },
    [orderedIds, activeId, recordBookmark, applySort],
  );

  const onToggleSelection = useCallback(
    (id: string) => {
      const player = allPlayers.find((p) => p.id === id);
      const name = player !== undefined ? `${player.firstName} ${player.lastName}` : id;
      const next = selectedId === id ? null : id;
      setSelection(next);
      speak(
        "selection",
        next === null ? `Deselected ${name}.` : `Selected ${name}.`,
      );
    },
    [selectedId, allPlayers, setSelection, speak],
  );

  const onActiveChange = useCallback(
    (id: string) => {
      setActiveAndBookmark(id, makeTableFocusBookmark(TABLE_ID, orderedIds, id));
      const player = latest.current.players.find((p) => p.id === id);
      if (player === undefined) return;
      const terms = statusTermsOf(player);
      if (terms.length === 0) return;
      speak("row-status", `${player.firstName} ${player.lastName}: ${terms.join(", ")}.`);
    },
    [orderedIds, setActiveAndBookmark, speak],
  );

  const onRowPrimary = useCallback(
    (id: string) => {
      if (selectedId !== id) setSelection(id);
    },
    [selectedId, setSelection],
  );

  const setPositionFilter = useCallback(
    (position: string) => {
      const next =
        position === "" ? clearFilters() : upsertFilter(latest.current.filters, positionClause(position));
      applyFilter(next);
    },
    [applyFilter],
  );

  const setPreset = useCallback(
    (presetId: SquadPresetId) => {
      const preset = SQUAD_PRESETS.find((p) => p.id === presetId);
      if (preset === undefined) return;
      applyPreferences({
        visibleColumnIds: [...preset.visibleColumnIds],
        pinnedColumnIds: preferences.pinnedColumnIds,
        activePresetId: presetId,
      });
      speak("columns-preset", `Showing the ${preset.label} columns.`);
    },
    [applyPreferences, preferences.pinnedColumnIds, speak],
  );

  const toggleOneColumn = useCallback(
    (columnId: string) => {
      const next = toggleColumn(preferences.visibleColumnIds, columnId);
      applyPreferences({ ...preferences, visibleColumnIds: next, activePresetId: null });
    },
    [preferences, applyPreferences],
  );

  useEffect(() => {
    if (squadResult.waiting === true) return;
    if (activeId === null || orderedIds.includes(activeId)) return;
    const resolved = resolveTableFocus(
      latest.current.bookmark?.tableId === TABLE_ID ? latest.current.bookmark : null,
      orderedIds,
    );
    if (resolved === null) return;
    setActiveAndBookmark(resolved, makeTableFocusBookmark(TABLE_ID, orderedIds, resolved));
    focusRow(resolved);
  }, [orderedIds, squadResult.waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectionOut = selectedId !== null && !orderedIds.includes(selectedId);
  useEffect(() => {
    if (!selectionOut) return;
    setSelection(null);
    speak("selection-hidden", "The selected player is hidden by the current filters.");
  }, [selectionOut]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => discardSelectionForNavigation(TABLE_ID);
  }, []);

  return {
    state: {
      allPlayers,
      filtered,
      sort,
      filters,
      activeId,
      selectedId,
      bookmark,
      scrollLeft,
      legendExpanded,
      preferences,
      announcement,
      viewState,
      refreshState,
      copy,
      orderedIds,
      table,
    },
    actions: {
      setSort,
      setFilters,
      setSelection,
      setActiveAndBookmark,
      setBookmark,
      commitScroll,
      applyPreferences,
      setLegendExpanded,
      onSortCycle,
      onToggleSelection,
      onActiveChange,
      onRowPrimary,
      setPositionFilter,
      setPreset,
      toggleOneColumn,
      clearFilterCommand,
      clearSortCommand,
      refreshSquad,
    },
    meta: {
      saveId,
      speak,
      TABLE_ID,
      STATUS_LEGEND_ID,
      allPlayers,
    },
  };
};
