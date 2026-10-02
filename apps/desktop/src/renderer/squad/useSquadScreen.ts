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
 * - `useSquadTable` — the TanStack table wiring (columns, visibility, pinning).
 * - `useLineupFit` — the ephemeral selected-starter-slot, and with it the
 *   `readoutOf` / `displayRows` pair that turns that slot into the FIT mark and
 *   the re-ordered rows the focus universe walks.
 *
 * The assembly keeps what genuinely stitches those together: the atom data +
 * derived view state, the focus bookmarks, the callbacks that cross a concern
 * boundary, and the once-per-save global action-handler registration. It
 * publishes the flattened { state, actions, meta } triple through
 * `SquadProvider`; the shared shapes live in `squadScreenTypes.ts`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppRow } from "../table/tableFeatures.js";
import type { PlayerId, SaveId, SquadPlayerView } from "@cm-clone/contracts";
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
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
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
  filterChangeNotice,
  positionClause,
  removeFilter,
  statusClause,
  replaceAttributeFilters,
  upsertFilter,
  type AttributeThreshold,
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
import { assistantLineupOf } from "./lineupEdits.js";
import { useLineupFit } from "./useLineupFit.js";
import { prioritiseForPosition, type LineupFit, type LineupFitReadout } from "./lineupFit.js";
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
import { useSquadTable } from "./useSquadTable.js";
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

/**
 * What the roster publishes for the selected slot: the slot itself, plus which of the rows on
 * screen can fill it and at which Familiarity Tier. Read against the *filtered* rows, not the
 * whole squad, so a mark is only ever drawn beside a row the manager can actually see.
 */
const readoutOf = (
  context: LineupFit | null,
  rows: readonly SquadRow[],
): LineupFitReadout | null =>
  context === null ? null : { ...context, ...prioritiseForPosition(rows, context.position) };

/**
 * The rows in display order. The fit context re-orders TanStack's own SORTED rows rather than the
 * data the table was handed, which is what makes the screen's sort the tiebreak inside each
 * Familiarity Tier instead of something the highlight overwrites — a reorder of the input could
 * not promise that, since a sort would interleave the tiers again.
 *
 * Deliberately not memoised. The `filtered` array is rebuilt on every render, so TanStack rebuilds
 * its row model on every render too, and a memo keyed on `table` would hand back a stale
 * permutation of a row model that has since moved.
 */
const displayRows = (
  sorted: readonly AppRow<SquadRow>[],
  fit: LineupFitReadout | null,
): readonly AppRow<SquadRow>[] => {
  if (fit === null) return sorted;
  const byId = new Map(sorted.map((row) => [row.original.id, row]));
  // A permutation of `sorted`, so the map always resolves; the guard only satisfies the type.
  return prioritiseForPosition(sorted.map((row) => row.original), fit.position).ordered
    .map((original) => byId.get(original.id))
    .filter((row): row is AppRow<SquadRow> => row !== undefined);
};

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
  // What the last toolbar or Actions-menu command did (a view, filter, sort or lineup pick). It
  // goes to the shell's bottom bar, not the table's announcer, the way the Profile's held Scout
  // Player reason does; that bar line is itself a polite region, so saying it twice would double up.
  const [barNotice, setBarNotice] = useState<string | null>(null);

  // The shared match-day lineup draft, lifted from the bottom bar so the roster
  // rows can report who is selected to play or sit on the bench. The bar edits
  // it; the list only reads it.
  const lineup = useTacticDraft(saveId, { saveFailureMessage: SAVE_FAILURE });

  const latest = useRef({
    sort,
    filters,
    activeId,
    bookmark,
    players: [] as ReadonlyArray<SquadRow>,
    /** The same players as the wire carries them, so a row id can be turned back into the branded
     *  `PlayerId` a player-scoped route needs. The `SquadRow` above has flattened it to a string. */
    playerIds: [] as ReadonlyArray<PlayerId>,
    /** The wire players with their Position Ratings, which the assistant manager picks from. */
    squad: [] as ReadonlyArray<SquadPlayerView>,
    lineup,
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
  latest.current.playerIds = view !== undefined ? view.players.map((player) => player.id) : [];
  latest.current.squad = view !== undefined ? view.players : [];
  latest.current.lineup = lineup;

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

  const { context: fitContext, toggle: toggleFitContext, clear: clearFitContext } = useLineupFit(
    lineup.tactic,
  );
  const { table } = useSquadTable({
    data: filtered,
    sort,
    onSortChange: setSort,
    preferences,
    onOpenLegend: () => setLegendExpanded(true),
    fitActive: fitContext !== null,
  });
  const fit = readoutOf(fitContext, filtered);
  const rows = displayRows(table.getRowModel().rows, fit);
  // The roving-focus universe walks the DISPLAY order, not the sort: arrows must follow the eye
  // down the list, and a focus bookmark's neighbours are the ones the manager can see.
  const orderedIds = rows.map((row) => row.original.id);

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
      if (announceLabel !== undefined) setBarNotice(announceLabel);
    },
    [setSort],
  );

  const applyFilter = useCallback(
    (next: readonly FilterClause[]) => {
      const before = latest.current.filters;
      setFilters(next);
      const count = applyFilters(latest.current.players, next).length;
      setBarNotice(filterChangeNotice(before, next, count));
    },
    [setFilters],
  );

  const clearFilterCommand = useCallback(() => {
    setFilters(clearFilters());
    setBarNotice(`Cleared the filters. ${allPlayers.length} ${allPlayers.length === 1 ? "player is" : "players are"} shown.`);
  }, [setFilters, allPlayers.length]);

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
              setSort(null);
              setBarNotice("Cleared the Squad sort.");
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
      registerActionHandler("retry-squad-table", refreshSquad),
    );
    unregisters.push(
      registerActionHandler("assistant-pick-lineup", () => {
        const { tactic, setTactic, autosave } = latest.current.lineup;
        const next = assistantLineupOf(tactic, latest.current.squad);
        if (next === null) {
          setBarNotice(`The squad is too small to field a ${tactic.sourceTemplate}.`);
          return;
        }
        setTactic(next);
        void autosave(next);
        setBarNotice(`The assistant manager picked the team in a ${tactic.sourceTemplate}.`);
      }),
    );
    unregisters.push(
      registerActionHandler("restore-squad-columns", () => {
        const restored = resetSquadColumnPreferences();
        applyPreferences(restored);
        setBarNotice("Restored the default Squad columns.");
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

  /**
   * Open a player's player screen. CM 03/04's squad list made the name the way in, and this is
   * that: the name button's click and the row's primary action (Enter) both land here, so the
   * pointer and the keyboard open the same thing. Selection stays on Space, where it has always
   * been, rather than sharing the click.
   */
  const openPlayer = useCallback(
    (id: string, event: React.MouseEvent) => {
      const playerId = latest.current.playerIds.find((candidate) => candidate === id);
      if (playerId === undefined) return;
      navigateCareer({ type: "playerDetail", saveId, playerId }, intentOfClick(event));
    },
    [saveId],
  );

  const onRowPrimary = useCallback(
    (id: string) => {
      const playerId = latest.current.playerIds.find((candidate) => candidate === id);
      if (playerId === undefined) return;
      navigateCareer({ type: "playerDetail", saveId, playerId }, "keyboard");
    },
    [saveId],
  );

  /* Each dropdown edits only its own clause. "" clears that clause and nothing
   * else — clearing Position must not discard an active Status, and vice versa. */
  const setPositionFilter = useCallback(
    (position: string) => {
      const clause = positionClause(position);
      const current = latest.current.filters;
      applyFilter(position === "" ? removeFilter(current, clause) : upsertFilter(current, clause));
    },
    [applyFilter],
  );

  const setStatusFilter = useCallback(
    (status: string) => {
      const clause = statusClause(status);
      const current = latest.current.filters;
      applyFilter(status === "" ? removeFilter(current, clause) : upsertFilter(current, clause));
    },
    [applyFilter],
  );

  const setAttributeFilters = useCallback(
    (thresholds: readonly AttributeThreshold[]) => {
      applyFilter(replaceAttributeFilters(latest.current.filters, thresholds));
    },
    [applyFilter],
  );

  const countWithAttributeFilters = useCallback(
    (thresholds: readonly AttributeThreshold[]) =>
      applyFilters(latest.current.players, replaceAttributeFilters(latest.current.filters, thresholds)).length,
    [],
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
      setBarNotice(`Showing the ${preset.label} columns.`);
    },
    [applyPreferences, preferences.pinnedColumnIds],
  );

  /** Choosing a view is one act: the layout changes, and a table view also
   *  applies its columns. The two never drift apart, because nothing else can
   *  set the layout. */
  const setView = useCallback(
    (nextViewId: SquadViewId) => {
      const view = squadViewById(nextViewId);
      setViewId(view.id);
      if (view.presetId !== undefined) setPreset(view.presetId);
      else setBarNotice(`Showing the squad by ${view.label}.`);
    },
    [setViewId, setPreset],
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
      barNotice,
      viewState,
      refreshState,
      copy,
      orderedIds,
      rows,
      fit,
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
      toggleFitContext,
      clearFitContext,
      openPlayer,
      setPositionFilter,
      setStatusFilter,
      setAttributeFilters,
      countWithAttributeFilters,
      setPreset,
      setView,
      toggleOneColumn,
      clearFilterCommand,
      refreshSquad,
      captureForNavigation,
      restoreScroll,
    },
    meta: {
      saveId,
      speak,
      TABLE_ID,
      allPlayers,
    },
    lineup,
  };
};
