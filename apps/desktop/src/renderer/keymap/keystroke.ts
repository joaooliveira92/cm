import { type Keystroke } from "../actions/types.js";

/**
 * Keystroke normalization + text-input suppression (global-key-map note).
 *
 * Suppression policy (AC-19 / key-map note AC-20): when focus is in a text entry
 * (input, textarea, select, or contenteditable) the bare letter/digit keys,
 * `Space` (career-global Continue) and `g` prefix initiation are suppressed;
 * `Enter`, `Escape`, `Tab`, arrows, and the `Primary`+keys stay active.
 *
 * `event.key` is layout-independent (produced character), so `Primary+/` resolves
 * through the produced character — the help overlay key is reachable on non-QWERTY.
 */

/** Primary modifier: Cmd on macOS, Ctrl elsewhere — decided at the seam/edge, not here. */
export const PRIMARY_MOD_IS_META = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

/** Normalise a DOM-ish keyboard event into the spine's platform-independent `Keystroke`. */
export const keyOf = (
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">,
): Keystroke => ({
  key: event.key,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
  shift: event.shiftKey,
  primary:
    (PRIMARY_MOD_IS_META && event.metaKey) || (!PRIMARY_MOD_IS_META && event.ctrlKey),
});

/** True when the event target (or an ancestor) is a text-entry control. */
export const isTextEntryTarget = (target: EventTarget | null): boolean => {
  const node = allowTarget(target);
  if (node === null) return false;
  return Boolean(
    node.closest?.(
      'input, textarea, select, [contenteditable="true"], [role="combobox"][aria-expanded]',
    ),
  );
};

const allowTarget = (target: EventTarget | null): Element | null =>
  target instanceof Element ? target : null;

/** Bare (unmodified) letter or digit produced by a key. */
export const isBareLetterOrDigit = (keystroke: Keystroke): boolean =>
  !keystroke.ctrl &&
  !keystroke.meta &&
  !keystroke.shift &&
  /^[a-z0-9]$/i.test(keystroke.key);

/**
 * The full suppression predicate (AC-19): given the focus target and the typed
 * key, should the spine suppress its own bare-key handling so the text field gets
 * the keystroke? Only bare letter/digit and Space are suppressed; navigational
 * and modifier keys pass through untouched.
 */
export const shouldSuppressForTextEntry = (
  target: EventTarget | null,
  keystroke: Keystroke,
): boolean => {
  if (!isTextEntryTarget(target)) return false;
  if (keystroke.primary || keystroke.ctrl || keystroke.meta) return false;
  const key = keystroke.key;
  // Enter/Escape/Tab/arrows are navigational and never suppressed while typing.
  if (["Enter", "Escape", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
    return false;
  }
  return isBareLetterOrDigit(keystroke) || key === " ";
};

/**
 * True when the focused control already treats `Space` as its own activation.
 *
 * A native `<button>` (and anything carrying an activatable ARIA role) fires its click handler on
 * Space. A career-global binding on the *same* key therefore ran alongside it — one keystroke,
 * two actions, which is precisely what AC-17 forbids. The symptom that exposed it: pressing Space
 * to toggle a row's selection in a grid also fired `Continue` and advanced the Calendar out of
 * pre-season, silently closing the transfer window.
 *
 * `closest` rather than a tag check, because the focusable control is often a wrapper (a row
 * button containing spans) and the event target may be a descendant.
 *
 * Enter is deliberately not covered: no career-global or app-global action binds it today, so
 * adding it would change dispatch for flows nothing currently collides with.
 */
export const controlOwnsSpace = (target: EventTarget | null, keystroke: Keystroke): boolean => {
  if (keystroke.key !== " ") return false;
  if (keystroke.primary || keystroke.ctrl || keystroke.meta) return false;
  const node = allowTarget(target);
  if (node === null) return false;
  return Boolean(
    node.closest?.(
      'button, summary, [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="option"], [role="tab"]',
    ),
  );
};
