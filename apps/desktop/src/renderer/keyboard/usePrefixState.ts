/**
 * The `g <key>` prefix state (global-key-map note, AC-18). Manages the prefix
 * lifecycle: state, the ~800ms auto-cancel timeout, and publishing the active
 * flag to ScopeState so the navbar can reveal navigation hotkeys while the
 * prefix is pending.
 */

import { useEffect, useState } from "react";
import { clearScopeState, setScopeState } from "../actions/scopeState.js";
import { IDLE_PREFIX, type PrefixState } from "../keymap/prefix.js";
import { prefixTimeoutMs } from "../keymap/timeout.js";

/** The shape `usePrefixState` returns to consumers — state plus its setter. */
export interface PrefixController {
  readonly prefix: PrefixState;
  readonly setPrefix: (next: PrefixState) => void;
}

/** Manage the `g <key>` prefix lifecycle. Returns the current prefix state and
 *  a setter that drives the machine forward. Registered once per spine mount;
 *  the timeout auto-cancels an incomplete prefix after ~800ms of no further
 *  input, and the active flag is published to ScopeState so the navbar can
 *  react to it. */
export const usePrefixState = (): PrefixController => {
  const [prefix, setPrefix] = useState<PrefixState>(IDLE_PREFIX);

  // ~800ms timeout auto-cancels an incomplete prefix with no further input.
  useEffect(() => {
    if (!prefix.active) return;
    const timer = setTimeout(() => setPrefix(IDLE_PREFIX), prefixTimeoutMs());
    return () => clearTimeout(timer);
  }, [prefix]);

  // Publish the active-prefix flag so the navbar can reveal the `g <key>`
  // navigation hotkeys on its buttons while the prefix is pending (in-between
  // `g` and the destination key). Cleaned on spine unmount, like the overlay.
  useEffect(() => {
    setScopeState({ prefixActive: prefix.active });
    return () => clearScopeState("prefixActive");
  }, [prefix.active]);

  return { prefix, setPrefix };
};