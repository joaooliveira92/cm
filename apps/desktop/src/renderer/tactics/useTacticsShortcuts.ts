import { useEffect } from "react";
import { dispatchAction } from "../actions/dispatch.js";

/** The screen's global keyboard shortcuts: Ctrl/Cmd+S saves (and is swallowed in-match), Escape
 *  clears the selected slot. `isInMatch` is listed so the handler reads the value current at the
 *  commit that registered it; `setSelectedSlot` is a stable setter. */
export const useTacticsShortcuts = ({
  isInMatch,
  setSelectedSlot,
}: {
  readonly isInMatch: boolean;
  readonly setSelectedSlot: (slotIndex: number | null) => void;
}): void => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isInMatch && (event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        return;
      }
      if (!isInMatch && (event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void dispatchAction("save-tactic");
        return;
      }
      if (event.key === "Escape") {
        setSelectedSlot(null);
        return;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isInMatch, setSelectedSlot]);
};
