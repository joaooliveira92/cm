import type { KeyBindingOverrides } from "./overrides.js";

/**
 * The live key-binding override map, published by the keyboard spine.
 *
 * The spine fetches overrides through the RPC seam and layers them over the
 * registry's coded defaults; anything else that wants to *show* a binding — the
 * career chrome's Continue badge, and any later chrome control — needs the same
 * effective binding without re-fetching it. A second fetch would be a second
 * source of truth: a rebind adopted by the spine mid-session would not reach the
 * badge, and the button would quietly claim a key that no longer dispatches.
 *
 * Deliberately the same shape as `scopeState.ts` — module-level store, one
 * publisher, `useSyncExternalStore` on the read side. Overrides are a
 * session-wide fact about the keyboard, not a value any one React subtree owns,
 * and threading them through a context from the spine (a sibling of the career
 * tree, not an ancestor) is not available.
 */

type Listener = () => void;

const EMPTY: KeyBindingOverrides = {};

let overrides: KeyBindingOverrides = EMPTY;
const listeners = new Set<Listener>();

/** Read the current override map. */
export const getBindingOverrides = (): KeyBindingOverrides => overrides;

/** Subscribe to override changes. Returns an unsubscribe fn. */
export const subscribeBindingOverrides = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Publish the effective override map (spine only). */
export const publishBindingOverrides = (next: KeyBindingOverrides): void => {
  overrides = next;
  for (const listener of listeners) listener();
};

/** Hard-reset for tests. */
export const resetBindingOverrides = (): void => {
  publishBindingOverrides(EMPTY);
};
