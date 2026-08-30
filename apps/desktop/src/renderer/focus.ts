/**
 * Focus coordinator — where keyboard-first focus policy lives. The router
 * initiates navigation, but never owns focus: a keyboard/palette-initiated
 * navigation requests focus on a *semantic target* (screen, region, item
 * identity); pointer navigation does not force focus; back navigation restores
 * the previous target where available.
 *
 * All state is intentionally session-local and identity-based: a target is a
 * stable id (`squad.player-list`, not a DOM path or an index).
 */

export type NavigationIntent = "keyboard" | "pointer";

/** A focus target by semantic identity, not DOM position (note AC-14). */
export interface SemanticTarget {
  /** The screen id the RouteView wrapper is keyed on (`data-focus-id`). */
  readonly screen: string;
  /** Region within the screen (reserved for ticket 06's focus model). */
  readonly region?: string;
  /** Item within the region (reserved for ticket 06's focus model). */
  readonly item?: string;
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

/** Move focus to a semantic target's node. No-op when it does not exist. */
export const focusSemanticTarget = (target: SemanticTarget): void => {
  const node = querySemanticTarget(target);
  if (node) node.focus();
};