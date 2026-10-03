import { useEffect } from "react";
import { dispatchAction } from "../actions/dispatch.js";

/** The screen's global keyboard shortcuts: Ctrl/Cmd+S saves (and is swallowed in-match), Escape
 *  clears the selected slot. The empty dependency array matches the effect it replaces: the handler
 *  closes over `isInMatch` and the stable setters. */
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
  }, []);
};
