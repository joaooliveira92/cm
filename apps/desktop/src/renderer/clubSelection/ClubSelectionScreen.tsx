import { useCallback, useEffect, useMemo, useState } from "react";
import { type ClubId, type ClubSelectionRow, type CompetitionId, type SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { ClubDetailPanel } from "./ClubDetailPanel.js";
import { ClubRail } from "./ClubRail.js";
import { LeagueSelector } from "./LeagueSelector.js";
import { leagueSummaryOf, rollClub } from "./model.js";
import { Button } from "../components/ui/button.js";
import { describeRpcError, getClubSelection } from "../rpc.js";

export interface ClubSelectionScreenProps {
  readonly saveId: SaveId;
  readonly selectedClubId: ClubId | null;
  readonly onSelect: (club: { readonly clubId: ClubId; readonly clubName: string } | null) => void;
}

export const ClubSelectionScreen = ({ saveId, selectedClubId, onSelect }: ClubSelectionScreenProps) => {
  const [clubs, setClubs] = useState<ReadonlyArray<ClubSelectionRow>>([]);
  const [leagues, setLeagues] = useState<ReadonlyArray<{ leagueId: CompetitionId; leagueName: string }>>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<CompetitionId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let live = true;
    const load = async () => {
      const outcome = await Effect.runPromise(getClubSelection(saveId).pipe(Effect.result));
      if (!live) return;
      if (Result.isFailure(outcome)) {
        setError("Failed to load clubs: " + describeRpcError(outcome.failure));
        setLoading(false);
        return;
      }
      setClubs(outcome.success.clubs);
      setLeagues(outcome.success.leagues);
      if (outcome.success.leagues.length > 0 && selectedLeagueId === null) {
        setSelectedLeagueId(outcome.success.leagues[0]!.leagueId);
      }
      setLoading(false);
    };
    void load();
    return () => {
      live = false;
    };
  }, [saveId, selectedLeagueId]);

  const filteredClubs = useMemo(
    () => (selectedLeagueId === null ? clubs : clubs.filter((c) => c.leagueId === selectedLeagueId)),
    [clubs, selectedLeagueId],
  );

  const currentLeague = leagues.find((l) => l.leagueId === selectedLeagueId);

  const summary = useMemo(() => leagueSummaryOf(filteredClubs), [filteredClubs]);
  const selectedClub = filteredClubs.find((club) => club.clubId === selectedClubId) ?? null;

  const handleSelect = useCallback(
    (club: ClubSelectionRow | null): void => {
      onSelect(club === null ? null : { clubId: club.clubId, clubName: club.clubName });
      setAnnouncement(club === null ? "" : `The panel shows ${club.clubName}.`);
    },
    [onSelect],
  );

  const handlePick = useCallback((): void => {
    const club = rollClub(filteredClubs, selectedClubId, Math.random);
    if (club === null) return;
    onSelect({ clubId: club.clubId, clubName: club.clubName });
    setAnnouncement(`Picked ${club.clubName}. The panel shows ${club.clubName}.`);
  }, [filteredClubs, onSelect, selectedClubId]);

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="flex min-h-0 w-[370px] shrink-0 flex-col gap-2">
        {selectedLeagueId !== null && (
          <LeagueSelector
            leagues={leagues}
            selectedLeagueId={selectedLeagueId}
            onLeagueChange={(leagueId) => {
              setSelectedLeagueId(leagueId);
              // Clear the club selection when switching leagues
              if (selectedClub !== null && !filteredClubs.some((c) => c.clubId === selectedClub.clubId)) {
                onSelect(null);
              }
            }}
          />
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