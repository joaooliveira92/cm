/**
 * What the quit guard needs to know about career creation, published across the router boundary.
 *
 * `QuitGuard` is mounted outside `<RouterProvider>` on purpose — it answers a question asked of the
 * application, not of a route — so it cannot read `CreateSessionContext`, which lives inside the
 * router tree. Moving either one to make a context reach is the wrong trade: the guard would become
 * route state, or the creation session would become application state, and neither is true.
 *
 * So the creation flow publishes one fact here and the guard subscribes to it. The store holds a
 * single value and no history; there is at most one creation flow, and a second would be a bug
 * upstream rather than something for this module to reconcile.
 */
import type { SaveId } from "@cm-clone/contracts";

/**
 * A provisional world the player would lose by quitting now.
 *
 * `id` is `null` while `beginCareer` is still in flight: the world is being built, so the player
 * must still be warned, but the renderer has no id yet and there is nothing it can name to delete.
 * The two fields are therefore not redundant — `present` drives the copy, `id` drives the discard.
 */
export interface ProvisionalCareer {
  readonly present: boolean;
  readonly id: SaveId | null;
}

const NONE: ProvisionalCareer = { present: false, id: null };

let current: ProvisionalCareer = NONE;
const listeners = new Set<() => void>();

/** Stable across reads while nothing has changed, which is what `useSyncExternalStore` requires. */
export const getProvisionalCareer = (): ProvisionalCareer => current;

export const subscribeProvisionalCareer = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Publish, or clear with `null`.
 *
 * Equal values are dropped rather than re-published. The creation flow calls this from an effect
 * that runs on every session change, and most of those changes are a typed character in the save
 * name — waking the quit guard for each one would make the guard's render count a function of
 * typing speed.
 */
export const setProvisionalCareer = (next: ProvisionalCareer | null): void => {
  const value = next ?? NONE;
  if (value.present === current.present && value.id === current.id) return;
  current = value;
  for (const listener of listeners) listener();
};

/** Test seam: drop the published value and every subscriber. */
export const resetProvisionalCareer = (): void => {
  current = NONE;
  listeners.clear();
};
