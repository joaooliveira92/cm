/**
 * Squad screen (ticket 19, Stage 5 — level-3 grid). TanStack-backed squad table
 * with row-oriented roving on a semantic `<table>`, sortable header buttons,
 * position filtering (name search is Market/Free Agents only), column
 * visibility (presets + per-column toggles + restore-defaults), identity-based
 * focus restoration across sort/filter/refetch, selection separate from focus,
 * and explicit result/refresh states with one polite status announcer. Squad
 * column preferences survive restart (reconciled); sort/filter/focus/scroll
 * are session-scoped.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { type SaveId } from "@cm-clone/contracts";
import { Option } from "effect";
import { POSITIONS } from "@cm-clone/shared";
import {
  AsyncResult,
  describeRpcError,
  squadAtom,
  typedError,
  useAtomRefresh,
  useAtomValue,
} from "./rpc.js";
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { Alert } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { focusIdOf, FOCUS_RING } from "./focus.js";
import { SQUAD_PALETTE_OPTIONS, tableSortAndFilterActions } from "./table/paletteActions.js";
import {
  SQUAD_COLUMN_LABELS,
  squadColumns,
  squadRowOf,
  type SquadRow,
} from "./table/squad/squadColumns.js";
import { DataTable } from "./table/DataTable.js";
import { useDataTable, visibleRowIds } from "./table/useDataTable.js";
import { classifyTableParamAction } from "./table/paramActions.js";
import { sortDirectionOf } from "./table/features/sorting.js";
import {
  applyFilters,
  clearFilters,
  positionClause,
  upsertFilter,
} from "./table/features/filtering.js";
import {
  DEFAULT_SQUAD_PRESET_ID,
  isSquadPresetId,
  SQUAD_ALL_COLUMN_IDS,
  SQUAD_PRESETS,
  SQUAD_TOGGLEABLE_COLUMN_IDS,
  toggleColumn,
  type SquadPresetId,
} from "./table/features/visibility.js";
import { StatusLegend, statusTermsOf } from "./table/squad/playerStatus.js";
import {
  loadSquadColumnPreferences,
  resetSquadColumnPreferences,
  saveSquadColumnPreferences,
  type SquadColumnPreferences,
} from "./table/columnPreferences.js";
import {
  discardSelectionForNavigation,
  readTableSession,
  updateTableSession,
} from "./table/tableState.js";
import {
  makeTableFocusBookmark,
  resolveTableFocus,
  type TableFocusBookmark,
} from "./table/focusBookmark.js";
import { announce } from "./table/announcement.js";
import {
  activeFilterCount,
  deriveRefreshState,
  deriveViewState,
  STATE_COPY,
  type TableStateCopy,
} from "./table/viewState.js";
import type { FilterClause, TableAnnouncement } from "./table/types.js";

const REGION = "squadTable";
const TABLE_ID = "squad";
/** Ties the Status header's disclosure button to the legend it expands. */
const STATUS_LEGEND_ID = "squad-status-legend";

export const SquadScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const squadResult = useAtomValue(squadAtom(saveId));
  const refreshSquad = useAtomRefresh(squadAtom(saveId));

  // --- session-scoped interaction state (seeded from what survived navigation).
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

  // --- the status abbreviation legend (Term Disclosure). Owned here rather
  // than in the header cell: the header lives inside the table's horizontally
  // scrolling, overflow-clipped container, which a 72px pinned cell cannot
  // escape, so the legend renders above the table and the header button points
  // at it through `aria-controls`.
  const [legendExpanded, setLegendExpanded] = useState(false);

  // --- persistent Squad column preferences (reconciled on load, saved on change).
  const [preferences, setPreferences] = useState<SquadColumnPreferences>(() =>
    loadSquadColumnPreferences(),
  );
  const applyPreferences = useCallback((next: SquadColumnPreferences) => {
    setPreferences(next);
    saveSquadColumnPreferences(next);
  }, []);

  // Latest-value refs the stable live handlers read through (they register once
  // per saveId; every read of current sort/filter/player data goes through refs
  // so a keystroke can never act on a stale closure).
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

  // --- announcement (one polite status per table, deduplicated).
  const [announcement, setAnnouncement] = useState<TableAnnouncement | null>(null);
  const speak = useCallback((eventId: string, message: string) => {
    if (announce({ tableId: TABLE_ID, eventId, message })) {
      setAnnouncement({ tableId: TABLE_ID, eventId, message });
    }
  }, []);

  const error = typedError(squadResult);
  // The current-or-previous success: a failed background revalidation flips the
  // atom to `Failure` but keeps the last `Success` in `previousSuccess`
  // (Atom.make's effect re-runs through `fromExitWithPrevious`). Rows remain
  // usable exactly when this Option is Some — the seam separating a blocking
  // load failure from a non-blocking refresh failure (F1).
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

  const columns = squadColumns({
    expanded: legendExpanded,
    legendId: STATUS_LEGEND_ID,
    onToggle: () => setLegendExpanded((open) => !open),
  });
  const table = useDataTable<SquadRow>({
    columns,
    data: filtered,
    sort,
    onSortChange: setSort,
    columnVisibility: Object.fromEntries(
      SQUAD_ALL_COLUMN_IDS.map((columnId) => [
        columnId,
        preferences.visibleColumnIds.includes(columnId),
      ]),
    ),
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

  // --- live handlers: the enumerated palette rows (built from the SAME options
  // as the registry, so a palette row always has a live dispatcher — AC-16),
  // retry, and restore-column-defaults.
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
    // Handlers read through refs; only saveId changes their meaning.
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
      // The focused row's statuses reach the polite announcer as full terms —
      // the three-letter code is a visual shorthand and is never spoken. A row
      // with nothing modeled announces nothing rather than "no statuses".
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

  // --- focus restoration (AC-31): after sort/filter/refetch, restore the same
  // player by stable id with neighbour fallback; never `document.body`.
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

  // --- selection cleared when the selected row is filtered out (explicit,
  // first implementation — the note's rule).
  const selectionOut = selectedId !== null && !orderedIds.includes(selectedId);
  useEffect(() => {
    if (!selectionOut) return;
    setSelection(null);
    speak("selection-hidden", "The selected player is hidden by the current filters.");
  }, [selectionOut]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- navigation cleared the selection on screen exit (session keeps the rest).
  useEffect(() => {
    return () => discardSelectionForNavigation(TABLE_ID);
  }, []);

  if (viewState._tag === "LoadError") {
    return (
      <main className="min-h-screen bg-background p-8 text-foreground">
        <h1 className="text-2xl font-bold">Squad</h1>
        <Alert variant="destructive" className="mt-6">
          <p>{viewState.error.message}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            data-action-id="retry-squad-table"
            onClick={() => void dispatchAction("retry-squad-table")}
          >
            {copy.retryLabel}
          </Button>
        </Alert>
      </main>
    );
  }


  const activePosition = filters.find(
    (f): f is Extract<FilterClause, { readonly _tag: "position" }> => f._tag === "position",
  );

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      {/* Section name only — the club lives in the career chrome's title bar. */}
      <h1 className="text-2xl font-bold">Squad</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {allPlayers.length} players
        {refreshState._tag === "Refreshing" && (
          <span className="ml-2 text-text-muted">Refreshing…</span>
        )}
        {refreshState._tag === "RefreshFailed" && (
          <span className="ml-2 text-destructive">
            {copy.refreshFailed}{" "}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-action-id="retry-squad-table"
              onClick={() => void dispatchAction("retry-squad-table")}
            >
              {copy.retryLabel}
            </Button>
          </span>
        )}
      </p>

      {/* Visible filter controls (AC-30): native controls showing active state. */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-text-body">
          Position
          <select
            aria-label="Filter squad by position"
            value={activePosition?.position ?? ""}
            onChange={(event) => setPositionFilter(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">All positions</option>
            {POSITIONS.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>
        {activeFilterCount(filters) > 0 && (
          <Button
            type="button"
            variant="secondary"
            data-action-id="clear-squad-filters"
            onClick={clearFilterCommand}
          >
            {copy.clearFiltersLabel}
          </Button>
        )}
      </div>

      {/* Column visibility controls (Squad only): presets + per-column toggles. */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-text-body">
          Columns
          <select
            aria-label="Squad column preset"
            value={preferences.activePresetId ?? DEFAULT_SQUAD_PRESET_ID}
            onChange={(event) => {
              const value = event.target.value;
              if (isSquadPresetId(value)) setPreset(value);
            }}
            className={SELECT_CLASS}
          >
            {SQUAD_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="secondary"
          data-action-id="restore-squad-columns"
          onClick={() => void dispatchAction("restore-squad-columns")}
        >
          Restore defaults
        </Button>
        <details className="text-text-body">
          <summary className={`cursor-pointer ${FOCUS_RING.join(" ")}`}>
            Show / hide columns
          </summary>
          <div className="mt-2 grid max-h-64 grid-cols-3 gap-x-4 gap-y-1 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-3 text-xs">
            {/* Name and Status are absent, not disabled: they are protected
                columns, and offering a checkbox that never moves implies the
                guarantee is a setting. */}
            {SQUAD_TOGGLEABLE_COLUMN_IDS.map((columnId) => (
              <label key={columnId} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={preferences.visibleColumnIds.includes(columnId)}
                  onChange={() => toggleOneColumn(columnId)}
                  className={`accent-text-highlight ${FOCUS_RING.join(" ")}`}
                />
                {SQUAD_COLUMN_LABELS[columnId] ?? columnId}
              </label>
            ))}
          </div>
        </details>
      </div>

      {viewState._tag === "InitialLoading" && (
        <div aria-busy="true" className="py-10 text-text-secondary">
          {copy.initialLoading}
        </div>
      )}
      {viewState._tag === "EmptyDataset" && (
        <div className="py-10 text-text-secondary">
          <p>{copy.emptyDataset}</p>
          {/* Empty-squad affordances (note's Empty Squad line): real buttons
              dispatching the registered navigation Actions — never bare text.
              Free Agents live on the Transfers screen, so both navigate there
              through the same typed destination Action as the key map. */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              data-action-id="go-to-transfers"
              onClick={() => void dispatchAction("go-to-transfers")}
            >
              Explore Free Agents
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-action-id="go-to-transfers"
              onClick={() => void dispatchAction("go-to-transfers")}
            >
              Go to Transfer Market
            </Button>
          </div>
        </div>
      )}
      {viewState._tag === "NoFilterResults" && (
        <div className="py-10 text-text-secondary">
          <p>{copy.noFilterResults}</p>
          <p className="mt-2">
            <Button
              type="button"
              variant="secondary"
              data-action-id="clear-squad-filters"
              onClick={clearFilterCommand}
            >
              {copy.clearFiltersLabel}
            </Button>
          </p>
        </div>
      )}
      {legendExpanded && <StatusLegend id={STATUS_LEGEND_ID} />}

      {/* The table + its one polite status announcer render in every
          non-blocking state, so the announced line survives a transition to
          zero rows (F3); the <table> itself only mounts when rows exist. */}
      <DataTable
        tableId={TABLE_ID}
        screen="squad"
        region={REGION}
        table={table}
        orderedIds={orderedIds}
        identityColumnId="name"
        activeId={activeId}
        onActiveChange={onActiveChange}
        onBookmarkChange={setBookmark}
        selectedId={selectedId}
        onToggleSelection={onToggleSelection}
        onSortChange={onSortCycle}
        busy={refreshState._tag === "Refreshing"}
        enableShiftScroll
        onRowPrimary={onRowPrimary}
        ariaLabel="Squad"
        announcement={announcement?.message ?? ""}
        initialScrollLeft={scrollLeft}
        onScrollCommit={commitScroll}
      />
    </main>
  );
};

/** Native `<select>` paint. See the note in `table/TablePanel.tsx`. */
const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;
