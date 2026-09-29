import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ClubId, ClubSelectionRow } from "@cm-clone/contracts";

/**
 * The rail's roving tabindex: which row holds the tab stop, and the keys that move it. ↑/↓ and
 * Home/End move focus only; Enter selects the focused row and Space toggles it off.
 */
export const useClubRailRoving = (
  clubs: ReadonlyArray<ClubSelectionRow>,
  selectedClubId: ClubId | null,
  onSelect: (club: ClubSelectionRow | null) => void,
) => {
  const [activeClubId, setActiveClubId] = useState<ClubId | null>(null);
  const rowRefs = useRef(new Map<ClubId, HTMLDivElement | null>());

  /** The roving tab stop: the focused row, else the selected one, else the first row. */
  const tabStopId = activeClubId ?? selectedClubId ?? clubs[0]?.clubId ?? null;

  const registerRow = useCallback((clubId: ClubId, node: HTMLDivElement | null): void => {
    rowRefs.current.set(clubId, node);
  }, []);

  const focusRow = useCallback((clubId: ClubId | undefined): void => {
    if (clubId === undefined) return;
    setActiveClubId(clubId);
    rowRefs.current.get(clubId)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (clubs.length === 0) return;
      const index = clubs.findIndex((club) => club.clubId === tabStopId);
      const current = index === -1 ? 0 : index;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusRow(clubs[Math.min(current + 1, clubs.length - 1)]?.clubId);
          return;
        case "ArrowUp":
          event.preventDefault();
          focusRow(clubs[Math.max(current - 1, 0)]?.clubId);
          return;
        case "Home":
          event.preventDefault();
          focusRow(clubs[0]?.clubId);
          return;
        case "End":
          event.preventDefault();
          focusRow(clubs[clubs.length - 1]?.clubId);
          return;
        case "Enter": {
          event.preventDefault();
          const club = clubs[current];
          if (club !== undefined) onSelect(club);
          return;
        }
        case " ": {
          event.preventDefault();
          const club = clubs[current];
          if (club !== undefined) onSelect(club.clubId === selectedClubId ? null : club);
          return;
        }
        default:
      }
    },
    [clubs, focusRow, onSelect, selectedClubId, tabStopId],
  );

  return { tabStopId, registerRow, setActiveClubId, handleKeyDown };
};
