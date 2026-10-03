/**
 * The Squad screen's shared shapes — the { state, actions, meta } triple the
 * provider publishes to its leaves. Lifted into their own module so the
 * provider, the assembly hook and any consumer share one interface without
 * importing the hook implementation that owns the state.
 */
import type { AppRow, AppTable } from "../table/tableFeatures.js";
import type { SaveId } from "@cm-clone/contracts";
import type { AttributeThreshold } from "../table/features/filtering.js";
import type { SquadColumnPreferences } from "../table/columnPreferences.js";
import type { TableFocusBookmark } from "../table/focusBookmark.js";
import type { SquadRow } from "../table/squad/squadColumns.js";
import type { FilterClause, SortState, TableAnnouncement } from "../table/types.js";
import type { deriveRefreshState, deriveViewState, TableStateCopy } from "../table/viewState.js";
import type { SquadPresetId } from "../table/features/visibility.js";
import type { TacticDraft } from "../tactics/useTacticDraft.js";
import type { SquadViewId } from "./squadViews.js";
import type { LineupFitReadout } from "./lineupFit.js";
import type { DecodedListState } from "../navigation/list-state-storage.js";

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
  /** The chosen view (Screen 70): the position list, or one of the table presets. */
  readonly viewId: SquadViewId;
  readonly announcement: TableAnnouncement | null;
  /** What the last toolbar or Actions-menu command did ("Showing the squad by Traditional.",
   *  "3 players match the current filters."), for the shell's bottom bar. */
  readonly barNotice: string | null;
  readonly viewState: ReturnType<typeof deriveViewState>;
  readonly refreshState: ReturnType<typeof deriveRefreshState>;
  readonly copy: TableStateCopy;
  readonly orderedIds: readonly string[];
  readonly table: AppTable<SquadRow>;
  /** The TanStack rows in DISPLAY order: TanStack's own sorted order, then the fit context's
   *  re-ordering on top. Both roster layouts draw this, so the table and the position list cannot
   *  disagree about who is at the top. */
  readonly rows: readonly AppRow<SquadRow>[];
  /** The selected empty starter slot and the Position it asks for, plus which rows fit it and
   *  how well — `null` while no slot is selected. Session-only; never in the filter state. */
  readonly fit: LineupFitReadout | null;
}

export interface SquadScreenActions {
  readonly setSort: (next: SquadScreenState["sort"]) => void;
  readonly setFilters: (next: readonly FilterClause[]) => void;
  readonly setSelection: (next: string | null) => void;
  readonly setActiveAndBookmark: (
    id: string | null,
    bookmark: TableFocusBookmark | null,
  ) => void;
  readonly setBookmark: (bookmark: TableFocusBookmark | null) => void;
  readonly commitScroll: (left: number) => void;
  readonly applyPreferences: (next: SquadColumnPreferences) => void;
  readonly setLegendExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  readonly onSortCycle: (next: SquadScreenState["sort"]) => void;
  readonly onToggleSelection: (id: string) => void;
  readonly onActiveChange: (id: string) => void;
  readonly onRowPrimary: (id: string) => void;
  /** Select the empty starter slot at `order`, or clear the fit context when it is the one
   *  already selected. A no-op on any slot that is not an empty starter — bench slots name no
   *  Position, and a filled slot has no one left to suggest for. */
  readonly toggleFitContext: (order: number) => void;
  /** Drop the fit context, whichever slot named it. */
  readonly clearFitContext: () => void;
  /** Open one player's player screen. The row's way in — the name button's click and the row's
   *  primary action both land here, so pointer and keyboard open the same thing. */
  readonly openPlayer: (id: string, event: React.MouseEvent) => void;
  readonly setPositionFilter: (position: string) => void;
  /** Set the status clause to a modeled abbreviation, or remove it with "". */
  readonly setStatusFilter: (status: string) => void;
  /** Replace every attribute threshold (owned Squad only) with these, in one step; an empty
   *  list removes them all. Position and Status stay as they are. */
  readonly setAttributeFilters: (thresholds: readonly AttributeThreshold[]) => void;
  /** How many players the current filters would leave with these thresholds in place of the
   *  current ones: the Attribute dialog's live count. */
  readonly countWithAttributeFilters: (thresholds: readonly AttributeThreshold[]) => number;
  readonly setPreset: (presetId: SquadPresetId) => void;
  readonly setView: (viewId: SquadViewId) => void;
  readonly toggleOneColumn: (columnId: string) => void;
  readonly clearFilterCommand: () => void;
  readonly refreshSquad: () => void;
  /** Encode the current list state into URL search params so back/forward restores it. */
  readonly captureForNavigation: (state: Partial<DecodedListState>) => void;
  /** Restore scroll position from history.state after back/forward. */
  readonly restoreScroll: (containerIds?: readonly string[]) => void;
}

export interface SquadScreenMeta {
  readonly saveId: SaveId;
  readonly speak: (eventId: string, message: string) => void;
  readonly TABLE_ID: string;
  readonly allPlayers: ReadonlyArray<SquadRow>;
}

export interface SquadScreenValue {
  readonly state: SquadScreenState;
  readonly actions: SquadScreenActions;
  readonly meta: SquadScreenMeta;
  /** The shared match-day lineup draft: the eighteen slots the roster rows
   *  report against and the bottom bar edits. Lifted so both read the same
   *  assignment under one save lifecycle. */
  readonly lineup: TacticDraft;
}
