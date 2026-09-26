/**
 * Inline key badges (command-palette note, AC-25). Screen-scoped action buttons
 * display their binding as a small `kbd` badge; the display is *toggleable per
 * screen* through the registry's per-screen metadata (`SCREEN_METADATA`), not an
 * all-or-nothing project switch. `actionBadgeBinding` is the single decision
 * point so a rendered badge can never claim a binding the registry does not own.
 *
 * The badge shows the *effective* binding (overrides layered over the registry
 * default), so a rebind re-badges the button instead of leaving it advertising a
 * key that no longer fires (user-key-binding-overrides note).
 */
import { useSyncExternalStore } from "react";
import { Kbd } from "../components/ui/kbd.js";
import type { Action, ScreenName } from "../actions/types.js";
import { ACTION_REGISTRY, keyBadgesEnabledFor } from "../actions/allActions.js";
import { getBindingOverrides, subscribeBindingOverrides } from "../actions/bindingState.js";
import { effectiveBinding, type KeyBindingOverrides } from "../actions/overrides.js";

/** The badge binding for a screen-scoped action, or null when the screen opted
 *  out (or the action is not this screen's own). Cheapest-first: metadata gate,
 *  then the scope/binding checks. */
export const actionBadgeBinding = (
  action: Action,
  screen: ScreenName,
  overrides: KeyBindingOverrides,
): string | null => {
  if (!keyBadgesEnabledFor(screen)) return null;
  if (action.scope !== screen) return null;
  return effectiveBinding(action, overrides) ?? null;
};

/** `actionBadgeBinding` for a registry id, subscribed to the published override
 *  store so the badge follows a rebind the moment it is adopted. */
export const useActionBadgeBinding = (actionId: string, screen: ScreenName): string | null => {
  const overrides = useSyncExternalStore(
    subscribeBindingOverrides,
    getBindingOverrides,
    getBindingOverrides,
  );
  const action = ACTION_REGISTRY.get(actionId);
  return action === undefined ? null : actionBadgeBinding(action, screen, overrides);
};

/** A small `kbd` badge announcing a button's keyboard binding. Non-interactive:
 *  it never carries `data-action-id` or a click handler, so the screen's
 *  rendered-Action inventory (AC-16) stays exactly the controls that dispatch. */
export const ActionKeyBadge = ({ binding }: { readonly binding: string }) => (
  <Kbd aria-label={`Keyboard shortcut ${binding}`}>{binding}</Kbd>
);
