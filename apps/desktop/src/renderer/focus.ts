/**
 * Focus coordinator — where keyboard-first focus policy lives. The router
 * initiates navigation, but never owns focus: a keyboard/palette-initiated
 * navigation requests focus on a *semantic target* (screen, region, item
 * identity); pointer navigation does not force focus; back navigation restores
 * the previous target where available.
 *
 * All state is intentionally session-local and identity-based: a target is a
 * stable id (`squad.player-list`, not a DOM path or an index).
 *
 * Ticket 06/17 additions (intra-screen focus model): the `FocusBookmark` semantic
 * type, identity-based async restoration that survives a full refetch, and the
 * roving-focus primitives for composite widgets. Resolution never lands on
 * `document.body` — the fallback chain ends at the region empty-state target,
 * then the screen primary, then the heading.
 */

export type NavigationIntent = "keyboard" | "pointer";

/** A focus target by semantic identity, not DOM position (note AC-14). */
export interface SemanticTarget {
  /** The screen id the RouteView wrapper is keyed on (`data-focus-id`). */
  readonly screen: string;
  /** Region within the screen. */
  readonly region?: string;
  /** Item within the region (stable identity, resolved with fallback). */
  readonly item?: string;
}

/**
 * A semantic focus bookmark for a composite region (intra-screen focus model):
 * the focused item's stable id plus its old next/prev neighbours, so a refetch
 * that reorders or removes the item can restore focus to the nearest survivor.
 * Session-local and identity-based — never index-based.
 */
export interface CollectionFocusBookmark {
  readonly item: string;
  /** The old next neighbour's stable id, if any. */
  readonly next?: string;
  /** The old previous neighbour's stable id, if any. */
  readonly prev?: string;
}

/** Sentinel meaning "restore the arriving screen's remembered main region". */
export const BACK_RESTORE_MARKER = "__back__";

let pending: SemanticTarget | null = null;

/** Record a keyboard/palette-requested destination focus before navigating. */
export const requestFocus = (target: SemanticTarget): void => {
  pending = target;
};

/** `g b` / history back: restore the arriving screen's main region. */
export const requestBackFocus = (): void => {
  pending = { screen: BACK_RESTORE_MARKER };
};

/** A route surface consumes the pending focus once on arrival; `null` after. */
export const consumePendingFocus = (): SemanticTarget | null => {
  const target = pending;
  pending = null;
  return target;
};

const escapeAttr = (value: string): string => value.replace(/["\\[\]]/g, "\\$&");

/** Resolve a semantic target to its focusable node, or `null` when absent. */
export const querySemanticTarget = (target: SemanticTarget): HTMLElement | null => {
  if (target.region === undefined) {
    return document.querySelector(`[data-focus-id="${escapeAttr(target.screen)}"]`);
  }
  const full = [target.screen, target.region, target.item]
    .filter((part): part is string => part !== undefined)
    .join(".");
  return document.querySelector(`[data-focus-id="${escapeAttr(full)}"]`);
};

/** Build the `data-focus-id` value for a (screen, region, item, control). */
export const focusIdOf = (
  screen: string,
  region?: string,
  item?: string,
  control?: string,
): string =>
  [screen, region, item, control].filter((part): part is string => part !== undefined).join(".");

/** Move focus to a semantic target's node. No-op when it does not exist. */
export const focusSemanticTarget = (target: SemanticTarget): void => {
  const node = querySemanticTarget(target);
  if (node) node.focus();
};

/**
 * Identity-based async restoration (AC-21). Resolves a collection bookmark to the
 * item id to focus after a refetch: same item → old next neighbour → old previous
 * neighbour → first still-present item → `null` (caller falls back to the region
 * empty-state target / primary / heading). Pure and unit-tested.
 */
export const resolveCollectionFocus = (
  bookmark: CollectionFocusBookmark | undefined,
  presentIds: ReadonlyArray<string>,
): string | null => {
  if (bookmark !== undefined) {
    if (presentIds.includes(bookmark.item)) return bookmark.item;
    if (bookmark.next !== undefined && presentIds.includes(bookmark.next)) return bookmark.next;
    if (bookmark.prev !== undefined && presentIds.includes(bookmark.prev)) return bookmark.prev;
  }
  return presentIds[0] ?? null;
};

/**
 * Restore focus to a resolved collection item by focusing its node in the DOM.
 * Never sends focus to `document.body`: when nothing resolves, the caller keeps
 * focus on the initiating control (or moves to the region's empty state).
 */
export const restoreCollectionFocus = (
  bookmark: CollectionFocusBookmark | undefined,
  presentIds: ReadonlyArray<string>,
  itemFocusId: (id: string) => string,
): void => {
  const selected = resolveCollectionFocus(bookmark, presentIds);
  if (selected === null) return;
  const node = document.querySelector(
    `[data-focus-id="${escapeAttr(itemFocusId(selected))}"]`,
  ) as HTMLElement | null;
  node?.focus();
};

/** Roving tabindex: the composite keeps one active tab stop (active item 0, others -1). */
export const rovingTabIndex = (activeId: string | null, itemId: string): 0 | -1 =>
  activeId === itemId ? 0 : -1;

/** Mark a region node `aria-busy` during a mutation so focus-on-initiator is stable. */
export const setBusy = (node: HTMLElement | null, busy: boolean): void => {
  if (node) node.setAttribute("aria-busy", busy ? "true" : "false");
};

/** The single `:focus-visible` ring treatment (intra-screen focus model). */
export const FOCUS_RING = [
  "outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-amber-300",
  "focus-visible:ring-offset-2",
  "focus-visible:ring-offset-slate-950",
];
