/**
 * Dialog keyboard ownership for the Transfers overlays (note: no-silent-discard
 * Keep/Discard dialog + the InlineModal counter-offer; focus-coordinator overlay
 * contract). On open the dialog remembers the invoking control (focus.ts) and
 * moves focus to its first control; while open Tab never escapes the dialog;
 * Escape invokes the caller's keep/close action; on close focus returns to the
 * invoking control. `restoreOnClose: false` is for dialogs whose close commits
 * focus to a different target (the discarded draft hands focus to the bid
 * input); the caller then restores explicitly.
 */
import { useCallback, useEffect, useRef } from "react";
import { rememberFocusForOverlay, restoreFocusAfterOverlay } from "../focus.js";

/** The browser tab order inside the dialog (native controls only). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogKeyboardOptions {
  /** The control to focus when the dialog opens. */
  readonly initialFocus: () => HTMLElement | null;
  /** Escape = the dialog's close/keep action (Escape never silently discards). */
  readonly onEscape: (event: React.KeyboardEvent) => void;
  /** When false, the unmount cleanup leaves focus alone (the close path owns it). */
  readonly restoreOnClose?: boolean;
}

export const useDialogKeyboard = ({
  initialFocus,
  onEscape,
  restoreOnClose = true,
}: DialogKeyboardOptions): {
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly onKeyDown: (event: React.KeyboardEvent) => void;
} => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  // Give the dialog the keyboard on open and hand it back on close, through the
  // focus coordinator's overlay helpers — the same contract the palette/help/
  // teaching overlays follow.
  useEffect(() => {
    rememberFocusForOverlay();
    initialFocusRef.current()?.focus();
    return () => {
      if (restoreOnClose) restoreFocusAfterOverlay();
    };
  }, [restoreOnClose]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onEscapeRef.current(event);
      return;
    }
    if (event.key !== "Tab") return;
    const container = containerRef.current;
    if (container === null) return;
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (nodes.length === 0) {
      event.preventDefault();
      return;
    }
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    const active = document.activeElement;
    const inside = active instanceof HTMLElement && nodes.includes(active);
    if (event.shiftKey) {
      // Wrap backwards: from the first control (or when focus somehow escaped
      // the dialog) return to the last.
      if (!inside || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (!inside || active === last) {
      // Wrap forwards: from the last control (or an escaped focus) cycle back
      // to the first — Tab can never walk out of an open aria-modal.
      event.preventDefault();
      first.focus();
    }
  }, []);

  return { containerRef, onKeyDown };
};