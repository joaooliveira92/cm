import { useCallback, useEffect, useRef } from "react";

/**
 * Hover-intent and close-tolerance timings (redesigned-navbar spec §5.1): opening a preview is
 * delayed so crossing the bar doesn't flash menus; leaving both the trigger and its submenu is
 * tolerated for a beat so diagonal movement stays open.
 */
const INTENT_DELAY_MS = 170;
const CLOSE_TOLERANCE_MS = 300;

export interface HoverIntentControls {
  /**
   * Pointer entered the trigger. Cancels any pending close (re-entering stays open), then either
   * swallows the enter when the target is already shown (`alreadyShown`) or schedules the preview
   * intent after the delay.
   */
  readonly handleEnter: (alreadyShown: boolean) => void;
  /** Pointer left the trigger/submenu: cancel any pending intent and schedule the close. */
  readonly handleLeave: () => void;
}

export const useHoverIntent = (
  onIntent: () => void,
  onLeaveIntent: () => void,
): HoverIntentControls => {
  const intentTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  // Clear pending timers on unmount so a navigated-away navbar never fires a
  // late preview into the next screen.
  useEffect(() => {
    return () => {
      if (intentTimer.current !== null) window.clearTimeout(intentTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const handleEnter = useCallback(
    (alreadyShown: boolean) => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      if (alreadyShown) {
        if (intentTimer.current !== null) {
          window.clearTimeout(intentTimer.current);
          intentTimer.current = null;
        }
        return;
      }
      if (intentTimer.current !== null) window.clearTimeout(intentTimer.current);
      intentTimer.current = window.setTimeout(() => {
        intentTimer.current = null;
        onIntent();
      }, INTENT_DELAY_MS);
    },
    [onIntent],
  );

  const handleLeave = useCallback(() => {
    if (intentTimer.current !== null) {
      window.clearTimeout(intentTimer.current);
      intentTimer.current = null;
    }
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      onLeaveIntent();
    }, CLOSE_TOLERANCE_MS);
  }, [onLeaveIntent]);

  return { handleEnter, handleLeave };
};