import { useEffect, type ReactNode } from "react";
import {
  BACK_RESTORE_MARKER,
  consumePendingFocus,
  focusSemanticTarget,
  FOCUS_RING,
} from "../focus.js";

/**
 * Wraps every stable route surface with the screen's semantic focus identity.
 * On arrival it consumes the focus-coordinator's pending target (set by
 * keyboard/palette navigation or back) and focuses by identity, so a pointer
 * navigation — which sets no pending target — never forces focus.
 *
 * The wrapper is itself the level-1 primary focus target (AC-22): it carries the
 * ring, so a screen with no other interactive control (read-only career screens)
 * still shows where focus landed on keyboard arrival.
 */
export const RouteView = ({
  screenId,
  fill = false,
  children,
}: {
  screenId: string;
  /** Let the screen own the height its parent gives it, for a step that is a full-height
   *  workspace rather than a document. Off by default: every other screen is a reading column. */
  fill?: boolean;
  children: ReactNode;
}) => {
  useEffect(() => {
    const target = consumePendingFocus();
    if (target === null) return;
    if (target.screen === BACK_RESTORE_MARKER) {
      focusSemanticTarget({ screen: screenId });
    } else if (target.screen === screenId) {
      focusSemanticTarget(target);
    }
  }, [screenId]);

  return (
    <div
      data-focus-id={screenId}
      tabIndex={-1}
      className={`${FOCUS_RING.join(" ")}${fill ? " flex min-h-0 flex-1 flex-col" : ""}`}
    >
      {children}
    </div>
  );
};