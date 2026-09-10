/**
 * Leader-key hints (global-key-map note, `g <key>` prefix lifecycle). While the
 * `g` prefix is pending, a navigation control shows the key that completes it as
 * a badge pinned to its corner, so the player finds the key on the control they
 * were already looking at instead of reading it off the `PrefixIndicator`.
 *
 * The key is never a prop. It is the *effective* binding for the destination
 * (overrides layered over the registry default), read from the same published
 * stores the spine dispatches on, so a rebind re-badges the moment it is adopted
 * and a hint can never claim a key that no longer navigates.
 */
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { Kbd } from "../components/ui/kbd.js";
import { ALL_ACTIONS } from "../actions/allActions.js";
import { getBindingOverrides, subscribeBindingOverrides } from "../actions/bindingState.js";
import { navKeyByDestinationOf, withEffectiveBindings } from "../actions/overrides.js";
import { getScopeState, subscribeScopeState } from "../actions/scopeState.js";
import type { SaveScopedCareerDestinationType } from "../navigation/destinations.js";

const isPrefixActive = (): boolean => getScopeState().prefixActive === true;

/** The completion key to show for `destination` right now, or null when the
 *  prefix is idle or the destination has no `g <key>` binding. */
export const usePrefixHintKey = (
  destination: SaveScopedCareerDestinationType | undefined,
): string | null => {
  const prefixActive = useSyncExternalStore(subscribeScopeState, isPrefixActive, isPrefixActive);
  const overrides = useSyncExternalStore(
    subscribeBindingOverrides,
    getBindingOverrides,
    getBindingOverrides,
  );
  const keys = useMemo(
    () => navKeyByDestinationOf(withEffectiveBindings(ALL_ACTIONS, overrides)),
    [overrides],
  );
  if (!prefixActive || destination === undefined) return null;
  return keys.get(destination) ?? null;
};

/**
 * Wrap a navigation control so it shows its `g <key>` completion while the
 * prefix is pending. Pass no `destination` for a control that should not carry
 * the hint; the wrapper still renders, so toggling a hint never remounts the
 * control and never drops its focus.
 *
 * The badge is a sibling of the control, not a child, and `aria-hidden`: the
 * control's accessible name stays its label, and the `PrefixIndicator` live
 * region already announces the full key list.
 */
export const ShortcutHint = ({
  destination,
  children,
}: {
  readonly destination?: SaveScopedCareerDestinationType | undefined;
  readonly children: ReactNode;
}) => {
  const hintKey = usePrefixHintKey(destination);
  return (
    <div className="relative inline-flex shrink-0">
      {children}
      {hintKey !== null && (
        <Kbd
          aria-hidden
          data-shortcut-hint={destination}
          className="absolute -top-1.5 -left-1.5 z-10 border-text-highlight/60 bg-panel-bg-strong text-text-highlight shadow-md"
        >
          {hintKey}
        </Kbd>
      )}
    </div>
  );
};
