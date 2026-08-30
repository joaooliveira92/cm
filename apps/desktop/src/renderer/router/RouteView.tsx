import { useEffect, type ReactNode } from "react";
import {
  BACK_RESTORE_MARKER,
  consumePendingFocus,
  focusSemanticTarget,
} from "../focus.js";

/**
 * Wraps every stable route surface with the screen's semantic focus identity.
 * On arrival it consumes the focus-coordinator's pending target (set by
 * keyboard/palette navigation or back) and focuses by identity, so a pointer
 * navigation — which sets no pending target — never forces focus.
 */
export const RouteView = ({ screenId, children }: { screenId: string; children: ReactNode }) => {
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
    <div data-focus-id={screenId} tabIndex={-1} className="outline-none">
      {children}
    </div>
  );
};