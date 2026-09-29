import { useMemo } from "react";
import type { ClubId, CompetitionId, SaveId } from "@cm-clone/contracts";
import { ClubDetailPanel } from "./ClubDetailPanel.js";
import { ClubRail } from "./ClubRail.js";
import { LeagueSelector } from "./LeagueSelector.js";
import { leagueSummaryOf } from "./model.js";
import { useAnnouncedSelection, type ClubPick } from "./useAnnouncedSelection.js";
import { useClubSelectionData } from "./useClubSelectionData.js";
import { Button } from "../components/ui/button.js";

export interface ClubSelectionScreenProps {
  readonly saveId: SaveId;
  readonly selectedClubId: ClubId | null;
  readonly onSelect: (club: ClubPick | null) => void;
}

export const ClubSelectionScreen = ({ saveId, selectedClubId, onSelect }: ClubSelectionScreenProps) => {
  const { clubs, leagues, selectedLeagueId, setSelectedLeagueId, loading, error } = useClubSelectionData(saveId);

  const filteredClubs = useMemo(
    () => (selectedLeagueId === null ? clubs : clubs.filter((c) => c.leagueId === selectedLeagueId)),
    [clubs, selectedLeagueId],
  );

  const summary = useMemo(() => leagueSummaryOf(filteredClubs), [filteredClubs]);
  const selectedClub = filteredClubs.find((club) => club.clubId === selectedClubId) ?? null;

  const { announcement, handleSelect, handlePick } = useAnnouncedSelection(filteredClubs, selectedClubId, onSelect);

  const handleLeagueChange = (leagueId: CompetitionId): void => {
    setSelectedLeagueId(leagueId);
    // Clear the club selection when switching leagues
    if (selectedClub !== null && !filteredClubs.some((c) => c.clubId === selectedClub.clubId)) {
      onSelect(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="flex min-h-0 w-[420px] shrink-0 flex-col gap-2">
        {selectedLeagueId !== null && (
          <LeagueSelector leagues={leagues} selectedLeagueId={selectedLeagueId} onLeagueChange={handleLeagueChange} />
        )}

        <ClubRail
          clubs={filteredClubs}
          loading={loading}
          error={error}
          selectedClubId={selectedClubId}
          onSelect={handleSelect}
        />

        <Button
          type="button"
          variant="secondary"
          onClick={handlePick}
          disabled={filteredClubs.length === 0}
          className="shrink-0"
        >
          Pick a team for me
        </Button>
      </div>

      <ClubDetailPanel club={selectedClub} summary={summary} announcement={announcement} />
    </div>
  );
};
