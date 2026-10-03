import { useSyncExternalStore } from "react";
import { ACTION_REGISTRY } from "../../actions/allActions.js";
import { isInsideCareer } from "../../actions/registry.js";
import { getScopeState, subscribeScopeState } from "../../actions/scopeState.js";
import type { Action } from "../../actions/types.js";
import { useCareerState } from "../CareerStateProvider.js";

export interface MenuAction {
  readonly action: Action;
  readonly available: boolean;
}

/** The current screen's menu actions, each with its availability; empty outside a screen. */
export const useMenuActions = (): ReadonlyArray<MenuAction> => {
  const { screenId } = useCareerState();
  const liveScopeState = useSyncExternalStore(subscribeScopeState, getScopeState, getScopeState);

  if (screenId === null) return [];

  // The store's own `ready` never turns true: the keyboard spine derives it from the screen being a
  // career screen, and the menu must read it the same way or every `ready`-gated action disappears.
  const scopeState = { ...liveScopeState, ready: isInsideCareer(screenId) };
  // Only actions that opt in with `menu`; everything else a screen registers is reached through
  // the keyboard and the command palette.
  return ACTION_REGISTRY.active(screenId, scopeState)
    .filter((action) => action.menu === true)
    .map((action) => ({ action, available: action.available(scopeState) }));
};
