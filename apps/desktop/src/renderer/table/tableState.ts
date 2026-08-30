/**
 * Session-scoped table state (note: Table state lifetime, AC-27). Per `TableId`,
 * interaction state survives component rerenders AND screen navigation within a
 * session: sort, filters, focus bookmark, scroll position, and Squad's column
 * visibility/preset copy. Selection is cleared on navigation (the Actions
 * region's dirty Bid draft is screen-local and dies with the unmount); only
 * Squad's column preferences survive an app restart (via
 * `columnPreferences.ts`). Module-level like `scopeState.ts`/`dispatch.ts`, so
 * a screen remount reads the live session and resets nothing silently.
 */
import type { FilterClause, SortState, TableId } from "./types.js";
import type { SquadPresetId } from "./features/visibility.js";
import type { TableFocusBookmark } from "./focusBookmark.js";

export interface TableSessionState {
  readonly sort: SortState | null;
  readonly filters: readonly FilterClause[];
  readonly focusBookmark: TableFocusBookmark | null;
  readonly selectedId: string | null;
  /** Horizontal scroll offset in the Shift+Arrow scroll region (px). */
  readonly scrollLeft: number;
  readonly scrollTop: number;
  /** Squad only: the session's column-visibility copy (restart persistence is
   *  the reconciled `SquadColumnPreferences`, seeded here on mount). */
  readonly squadVisibility: SquadVisibilitySession | null;
}

export interface SquadVisibilitySession {
  readonly visibleColumnIds: readonly string[];
  readonly activePresetId: SquadPresetId | null;
}

export const DEFAULT_TABLE_SESSION: TableSessionState = {
  sort: null,
  filters: [],
  focusBookmark: null,
  selectedId: null,
  scrollLeft: 0,
  scrollTop: 0,
  squadVisibility: null,
};

const sessions = new Map<TableId, TableSessionState>();

export const readTableSession = (tableId: TableId): TableSessionState | null =>
  sessions.get(tableId) ?? null;

/** Overwrite the session for a table (mounts seed from what survived). */
export const seedTableSession = (
  tableId: TableId,
  state: TableSessionState,
): void => {
  sessions.set(tableId, state);
};

/** Merge a patch into the live session. Returns the resulting session. */
export const updateTableSession = (
  tableId: TableId,
  patch: Partial<TableSessionState>,
): TableSessionState => {
  const next: TableSessionState = {
    ...(sessions.get(tableId) ?? DEFAULT_TABLE_SESSION),
    ...patch,
  };
  sessions.set(tableId, next);
  return next;
};

/** Navigation cleared the selection: a fresh screen must not act on a stale
 *  player, and the empty-after-navigation Actions region hides. */
export const discardSelectionForNavigation = (tableId: TableId): void => {
  const state = sessions.get(tableId);
  if (state === undefined) return;
  sessions.set(tableId, { ...state, selectedId: null });
};

/** Forget every session (tests, and a save switch must not leak across saves). */
export const resetTableSessions = (): void => {
  sessions.clear();
};