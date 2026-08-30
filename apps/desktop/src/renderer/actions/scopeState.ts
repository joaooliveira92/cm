import type { ScopeState } from "./types.js";

/**
 * The live ScopeState published by mounted screens (ADR-0012). The registry's
 * `available` predicates are evaluated against a read model that a screen owns —
 * e.g. League publishes `phase` and `advancing` so the Continue safety contract
 * (AC-19) is a predicate, not a hand-rolled bind. The spine merges this into
 * its own readiness state via `useSyncExternalStore`, so a predicate change
 * flows straight into the active set and the dispatcher.
 *
 * Screens call `setScopeState` on mount/data change and `clearScopeState` on
 * unmount; only the mounted screen writes, so "last writer wins" is the one
 * lifetime rule.
 */

type ScopeStatePatch = Partial<ScopeState>;
type Listener = () => void;

/** Mutable shadow of ScopeState so screens can clear their keys on unmount. */
type MutableScopeState = { ready: boolean } & Record<string, unknown>;

let state: MutableScopeState = { ready: false };
const listeners = new Set<Listener>();

/** Read the current live scope state (spine + tests). */
export const getScopeState = (): ScopeState => state;

/** Subscribe to scope-state changes (spine only). Returns an unsubscribe fn. */
export const subscribeScopeState = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Merge a screen-authored patch into the live scope state. */
export const setScopeState = (patch: ScopeStatePatch): void => {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
};

/** Remove screen-authored keys on unmount so stale values never leak. */
export const clearScopeState = (...keys: ReadonlyArray<string>): void => {
  let changed = false;
  for (const key of keys) {
    if (key in state) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete state[key];
      changed = true;
    }
  }
  if (changed) {
    for (const listener of listeners) listener();
  }
};

/** Hard-reset for tests. */
export const resetScopeState = (): void => {
  state = { ready: false };
  for (const listener of listeners) listener();
};