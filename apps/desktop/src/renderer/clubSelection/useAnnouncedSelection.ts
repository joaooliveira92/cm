import { useCallback, useState } from "react";
import type { ClubId, ClubSelectionRow } from "@cm-clone/contracts";
import { rollClub } from "./model.js";

/** What the screen reports upward: the chosen club's identity, not its whole row. */
export interface ClubPick {
  readonly clubId: ClubId;
  readonly clubName: string;
}

/**
 * Choosing a club, by hand or by `Pick a team for me`, and the sentence the panel's announcer
 * speaks for it. Roving focus never reaches here, so the announcer stays quiet while the rail roves.
 */
export const useAnnouncedSelection = (
  clubs: ReadonlyArray<ClubSelectionRow>,
  selectedClubId: ClubId | null,
  onSelect: (club: ClubPick | null) => void,
) => {
  const [announcement, setAnnouncement] = useState("");

  const handleSelect = useCallback(
    (club: ClubSelectionRow | null): void => {
      onSelect(club === null ? null : { clubId: club.clubId, clubName: club.clubName });
      setAnnouncement(club === null ? "" : `The panel shows ${club.clubName}.`);
    },
    [onSelect],
  );

  const handlePick = useCallback((): void => {
    const club = rollClub(clubs, selectedClubId, Math.random);
    if (club === null) return;
    onSelect({ clubId: club.clubId, clubName: club.clubName });
    setAnnouncement(`Picked ${club.clubName}. The panel shows ${club.clubName}.`);
  }, [clubs, onSelect, selectedClubId]);

  return { announcement, handleSelect, handlePick };
};
