/**
 * The Squad screen's shared shapes — the { state, actions, meta } triple the
 * provider publishes to its leaves. Lifted into their own module so the
 * provider, the assembly hook and any consumer share one interface without
 * importing the hook implementation that owns the state.
 */
import type { Table } from "@tanstack/react-table";
import type { SaveId } from "@cm-clone/contracts";
import type { SquadColumnPreferences } from "../table/columnPreferences.js";
import type { TableFocusBookmark } from "../table/focusBookmark.js";
import type { SquadRow } from "../table/squad/squadColumns.js";
import type { FilterClause, SortState, TableAnnouncement } from "../table/types.js";
import type { deriveRefreshState, deriveViewState, TableStateCopy } from "../table/viewState.js";
import type { SquadPresetId } from "../table/features/visibility.js";
import type { TacticDraft } from "../tactics/useTacticDraft.js";
import type { SquadViewId } from "./squadViews.js";

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
  readonly setPositionFilter: (position: string) => void;
  readonly setPreset: (presetId: SquadPresetId) => void;
  readonly setView: (viewId: SquadViewId) => void;
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
  /** The shared match-day lineup draft: the eighteen slots the roster rows
   *  report against and the bottom bar edits. Lifted so both read the same
   *  assignment under one save lifecycle. */
  readonly lineup: TacticDraft;
}
