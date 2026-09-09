import { useEffect, type ReactNode } from "react";
import { BACK_RESTORE_MARKER, consumePendingFocus, focusSemanticTarget } from "../focus.js";

/**
 * Wraps every stable route surface. On arrival it consumes the focus
 * coordinator's pending target (set by keyboard/palette navigation or back) and
 * focuses by semantic identity, so a pointer navigation — which sets no pending
 * target — never forces focus.
 *
 * The wrapper itself carries no focus identity (AC-22 level-1 target): each
 * screen's labelled `<main>` region is the `data-focus-id` arrival target, so a
 * screen-reader user hears the screen's name on keyboard arrival. The wrapper
 * is a plain layout container; the `fill` variant lets the screen own the
 * height of a full-height workspace instead of a reading column.
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
    <div className={fill ? "flex min-h-0 flex-1 flex-col" : undefined}>{children}</div>
  );
};