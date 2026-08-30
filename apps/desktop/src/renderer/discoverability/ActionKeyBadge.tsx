/**
 * Inline key badges (command-palette note, AC-25). Screen-scoped action buttons
 * display their binding as a small `kbd` badge; the display is *toggleable per
 * screen* through the registry's per-screen metadata (`SCREEN_METADATA`), not an
 * all-or-nothing project switch. `actionBadgeBinding` is the single decision
 * point so a rendered badge can never claim a binding the registry does not own.
 */
import type { Action, ScreenName } from "../actions/types.js";
import { keyBadgesEnabledFor } from "../actions/allActions.js";

/** The badge binding for a screen-scoped action, or null when the screen opted
 *  out (or the action is not this screen's own). Cheapest-first: metadata gate,
 *  then the scope/binding checks. */
export const actionBadgeBinding = (
  action: Action,
  screen: ScreenName,
): string | null => {
  if (!keyBadgesEnabledFor(screen)) return null;
  if (action.scope !== screen || action.binding === undefined) return null;
  return action.binding;
};

/** A small `kbd` badge announcing a button's keyboard binding. Non-interactive:
 *  it never carries `data-action-id` or a click handler, so the screen's
 *  rendered-Action inventory (AC-16) stays exactly the controls that dispatch. */
export const ActionKeyBadge = ({ binding }: { readonly binding: string }) => (
  <kbd
    aria-label={`Keyboard shortcut ${binding}`}
    className="rounded bg-slate-700 px-1 py-0.5 font-mono text-[0.6rem] font-semibold leading-none text-slate-200"
  >
    {binding}
  </kbd>
);