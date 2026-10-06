/**
 * The career screen's contribution to the shell's bottom bar — the same
 * module-level slot `screenToolbarControls` gives the toolbar, holding a
 * described `ScreenBottomBarActions` rather than JSX, so a screen still cannot
 * lay the bar out itself.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { ScreenBottomBarActions } from "./shell-bottom-bar-state.js";

type Listener = () => void;

let actions: ScreenBottomBarActions | null = null;
const listeners = new Set<Listener>();

const publish = (next: ScreenBottomBarActions | null): void => {
  actions = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getActions = (): ScreenBottomBarActions | null => actions;

export const clearScreenBottomBarActions = (): void => publish(null);

/** The bar's reading side, for the career shell. */
export const useRegisteredScreenBottomBarActions = (): ScreenBottomBarActions | null =>
  useSyncExternalStore(subscribe, getActions, getActions);

/**
 * Registers the calling screen's verbs for as long as it is mounted. Pass a
 * memoised value: a fresh object each render re-publishes each render.
 */
export const useScreenBottomBarActions = (next: ScreenBottomBarActions | null): void => {
  useEffect(() => {
    publish(next);
    return () => {
      if (actions === next) publish(null);
    };
  }, [next]);
};
