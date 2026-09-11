/**
 * Squad screen state hook — the assembly. All cross-cutting state, derived
 * values, and action handlers for the squad table were historically one 500+
 * line file. It is now composed from focused sub-hooks:
 *
 * - `useSquadSession` — the six persistable session inputs (sort, filters,
 *   focus, selection, bookmark, scroll) and their setters.
 * - `useSquadColumns` — the presentation preferences (view, column presets,
 *   status-legend disclosure).
 * - `useSquadAnnouncements` — the one polite screen-reader announcer.
 * - `useSquadTable` — the TanStack table wiring (columns, visibility, row ids).
 *
 * The assembly keeps what genuinely stitches those together: the atom data +
 * derived view state, the focus bookmarks, the callbacks that cross a concern
 * boundary, and the once-per-save global action-handler registration. It
 * publishes the flattened { state, actions, meta } triple through
 * `SquadProvider`; the shared shapes live in `squadScreenTypes.ts`.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
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
  squadRowOf,
  type SquadRow,
} from "../table/squad/squadColumns.js";
import { classifyTableParamAction } from "../table/paramActions.js";
import { sortDirectionOf } from "../table/features/sorting.js";
import {
  applyFilters,
  clearFilters,
  positionClause,
  upsertFilter,
} from "../table/features/filtering.js";
import {
  SQUAD_PRESETS,
  toggleColumn,
  type SquadPresetId,
} from "../table/features/visibility.js";
import { statusTermsOf } from "../table/squad/playerStatus.js";
import {
  squadViewById,
  type SquadViewId,
} from "./squadViews.js";
import {
  resetSquadColumnPreferences,
} from "../table/columnPreferences.js";
import { useTacticDraft } from "../tactics/useTacticDraft.js";
import {
  discardSelectionForNavigation,
} from "../table/tableState.js";
import {
  makeTableFocusBookmark,
  resolveTableFocus,
} from "../table/focusBookmark.js";
import {
  deriveRefreshState,
  deriveViewState,
  STATE_COPY,
  type TableStateCopy,
} from "../table/viewState.js";
import type { FilterClause } from "../table/types.js";
import { useSquadSession } from "./useSquadSession.js";
import { useSquadColumns } from "./useSquadColumns.js";
import { useSquadAnnouncements } from "./useSquadAnnouncements.js";
import { useSquadTable, STATUS_LEGEND_ID } from "./useSquadTable.js";
import type { SquadScreenValue } from "./squadScreenTypes.js";
import { useListState } from "../navigation/use-list-state.js";

export type {
  SquadScreenActions,
  SquadScreenMeta,
  SquadScreenState,
  SquadScreenValue,
} from "./squadScreenTypes.js";

const TABLE_ID = "squad";
const REGION = "squadTable";

/** The wording for a non-conflict lineup save failure (every slot must name a
 *  player; distinct ids are enforced client-side and server-side). */
const SAVE_FAILURE =
  "Failed to save lineup — every slot must name a distinct, still-registered player.";

export const useSquadScreen = (saveId: SaveId): SquadScreenValue => {
  const squadResult = useAtomValue(squadAtom(saveId));
  const refreshSquad = useAtomRefresh(squadAtom(saveId));

  const { restored, isRestoration, captureForNavigation, restoreScroll } = useListState();
  const { session, sessionActions } = useSquadSession(restored);
  const { sort, filters, activeId, selectedId, bookmark, scrollLeft } = session;
  const {
    setSort,
    setFilters,
    setSelection,
    setActiveAndBookmark,
    setBookmark,
    commitScroll,
  } = sessionActions;

  const { columnState, columnActions } = useSquadColumns();
  const { viewId, preferences, legendExpanded } = columnState;
  const { setViewId, applyPreferences, setLegendExpanded } = columnActions;

  const { announcement, speak } = useSquadAnnouncements();

  // The shared match-day lineup draft, lifted from the bottom bar so the roster
  // rows can report who is selected to play or sit on the bench. The bar edits
  // it; the list only reads it.
  const lineup = useTacticDraft(saveId, { saveFailureMessage: SAVE_FAILURE });

  useEffect(() => registerActionHandler("save-tactic", () => void lineup.save()), [lineup.save]);

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

  const error = typedError(squadResult);
  const view = Option.getOrUndefined(AsyncResult.value(squadResult));
  const allPlayers = useMemo(
    () => (view !== undefined ? view.players : []).map(squadRowOf),
    [view],
  );
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

  const toggleLegend = useCallback(() => setLegendExpanded((open) => !open), [setLegendExpanded]);
  const { table, orderedIds } = useSquadTable({
    data: filtered,
    sort,
    onSortChange: setSort,
    preferences,
    legendExpanded,
    onToggleLegend: toggleLegend,
  });

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
      const player = latest.current.players.find((p) => p.id === id);
      const name = player !== undefined ? `${player.firstName} ${player.lastName}` : id;
      const next = selectedId === id ? null : id;
      setSelection(next);
      speak(
        "selection",
        next === null ? `Deselected ${name}.` : `Selected ${name}.`,
      );
    },
    [selectedId, setSelection, speak],
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

  /** Choosing a view is one act: the layout changes, and a table view also
   *  applies its columns. The two never drift apart, because nothing else can
   *  set the layout. */
  const setView = useCallback(
    (nextViewId: SquadViewId) => {
      const view = squadViewById(nextViewId);
      setViewId(view.id);
      if (view.presetId !== undefined) setPreset(view.presetId);
      else speak("view-changed", `Showing the squad by ${view.label}.`);
    },
    [setViewId, setPreset, speak],
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

  // Restore scroll position when arriving via back/forward
  useEffect(() => {
    if (isRestoration) {
      restoreScroll();
    }
  }, [isRestoration, restoreScroll]);

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
      viewId,
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
      setView,
      toggleOneColumn,
      clearFilterCommand,
      clearSortCommand,
      refreshSquad,
      captureForNavigation: (state) => captureForNavigation(state),
      restoreScroll,
    },
    meta: {
      saveId,
      speak,
      TABLE_ID,
      STATUS_LEGEND_ID,
      allPlayers,
    },
    lineup,
  };
};
