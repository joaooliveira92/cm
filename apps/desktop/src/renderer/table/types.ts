/**
 * Table-layer vocabulary (table-and-grid-navigation note, Stage 5). Where the
 * note says "Bluewave", that toolkit does not exist — selection, focus/keyboard
 * navigation, Action availability, persistence, announcements, and domain
 * filter semantics are OURS (this renderer), never TanStack's. TanStack owns
 * row derivation and the sort/visibility machinery only.
 *
 * UI vocabulary lives here, never in CONTEXT.md (a pure game-domain glossary).
 */

/** The rover of table ids — hand-rendered bid tables and the League Table keep
 *  an id for naming, even though they stay off TanStack (note's adoption
 *  boundary). */
export type TableId =
  | "squad"
  | "transfer-market"
  | "free-agents"
  | "incoming-bids"
  | "outgoing-bids"
  | "league-table";

/** A column's stable id within its table (attribute keys double as column ids). */
export type ColumnId = string;

export type SortDirection = "asc" | "desc";

/** One active sort: at most one column, asc or desc (`null` = natural order). */
export interface SortState {
  readonly columnId: ColumnId;
  readonly direction: SortDirection;
}

/** A domain filter clause. Name search is a substring over the display name;
 *  position matches any position in the player's `positions` array. */
export type FilterClause =
  | { readonly _tag: "nameSearch"; readonly query: string }
  | { readonly _tag: "position"; readonly position: string };

/** The row shape every TanStack table in this layer is built over. */
export interface TableRowShape {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly positions: ReadonlyArray<{ readonly position: string }>;
}

/** The five explicit result states (note: Empty and result states). */
export interface TableLoadError {
  readonly message: string;
}

export type TableViewState =
  | { readonly _tag: "InitialLoading" }
  | { readonly _tag: "LoadError"; readonly error: TableLoadError }
  | { readonly _tag: "EmptyDataset" }
  | { readonly _tag: "NoFilterResults"; readonly activeFilterCount: number }
  | { readonly _tag: "Populated"; readonly visibleRowCount: number };

/** Orthogonal refresh state: a background revalidation while rows remain
 *  usable. A refresh failure preserves rows and is non-blocking. */
export type RefreshState =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Refreshing" }
  | { readonly _tag: "RefreshFailed"; readonly error: TableLoadError };

/** One polite `role="status"` announcement for a table. `eventId` distinguishes
 *  the triggering event; identical messages are deduplicated per table so a
 *  flood (e.g. many rows filtered at once) produces one spoken line. */
export interface TableAnnouncement {
  readonly tableId: TableId;
  readonly eventId: string;
  readonly message: string;
}