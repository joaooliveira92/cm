/**
 * The keyboard-binding seam (keyboard-binding-library note). This is the ONE
 * module that imports `react-hotkeys-hook`; every other renderer file imports
 * this seam instead. The choice is a single-file swap — if a future library
 * (e.g. TanStack Hotkeys at 1.0) covers scopes and priority layering, only this
 * file changes, and `scripts/effect-lint.ts` enforces that screens never import
 * the library directly.
 */
import {
  HotkeysProvider,
  useHotkeys,
  useHotkeysContext,
  type Options,
} from "react-hotkeys-hook";
import { type DependencyList } from "react";

/** Bind a hotkey through the seam. `enableOnFormTags` off by default (AC-19
 *  text-input suppression): bare keys stay native in text fields. */
export const useSeamHotkeys = (
  keys: string,
  callback: (event: KeyboardEvent) => void,
  options?: Options,
  deps?: DependencyList,
): void => {
  useHotkeys(keys, callback, options, deps);
};

/**
 * The spine's ONE keyboard input (ticket 17): a wildcard keydown binding that
 * forwards *every* keystroke to the caller. The dispatch model in `keymap/` is
 * authoritative — `resolveDispatch` decides per keystroke what the spine does
 * (native passthrough, prefix lifecycle, or one registered Action).
 * react-hotkeys-hook cannot express the prefix state machine or the suppression
 * predicate, so it is used here solely as the capture seam: `enableOnFormTags`
 * and `enableOnContentEditable` bring text-field and contenteditable keydowns
 * through so `shouldSuppressForTextEntry` can rule on them, and
 * `preventDefault: false` leaves default handling to the spine's decision.
 */
export const useSeamEveryKeyPress = (
  callback: (event: KeyboardEvent) => void,
  deps?: DependencyList,
): void => {
  useHotkeys(
    "*",
    callback,
    { enableOnFormTags: true, enableOnContentEditable: true, preventDefault: false },
    deps,
  );
};

/** Live registration enumeration (palette/help derive from registrations, not a
 *  hand-maintained list — Stage 4 consumes this). */
export const useSeamHotkeysContext = (): ReturnType<typeof useHotkeysContext> =>
  useHotkeysContext();

/** Wrap the renderer tree so hook-based bindings share one scope-enabling context. */
export const HotkeysBoundaryProvider = HotkeysProvider;

/** Re-exported option type for the seam's public API. */
export type SeamHotkeyOptions = Options;
