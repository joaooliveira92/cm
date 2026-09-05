import { useCallback, useEffect, useMemo, useState } from "react";
import { type ClubId, type ClubSelectionRow, type SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { ClubDetailPanel } from "./ClubDetailPanel.js";
import { ClubRail } from "./ClubRail.js";
import { LeagueSelector } from "./LeagueSelector.js";
import { leagueSummaryOf, rollClub } from "./model.js";
import { Button } from "../components/ui/button.js";
import { describeRpcError, getClubSelection } from "../rpc.js";

export interface ClubSelectionScreenProps {
  readonly saveId: SaveId;
  /** The club picked against this world, or `null`. Owned by the creation session. */
  readonly selectedClubId: ClubId | null;
  /** The one write path: `null` clears the pick. */
  readonly onSelect: (club: { readonly clubId: ClubId; readonly clubName: string } | null) => void;
}

/**
 * Club Selection as a two-column workspace: the rail of clubs on the left beside the detail panel
 * on the right, with the league selector above the rail and `Pick a team for me` below it.
 *
 * This component owns the screen-local reading of the payload and hands the rail and the panel
 * their props; the selection itself lives on the creation session, because it has to outlive this
 * screen and reach `commitCareer`. Three regions and one piece of state do not earn a context or
 * a compound component, and props keep both regions testable against a fixed selection.
 *
 * The rail loads and fails independently of the panel: skeleton rows and an inline error leave the
 * selector and the assist mounted, so a retry never reads as a different screen.
 */
export const ClubSelectionScreen = ({ saveId, selectedClubId, onSelect }: ClubSelectionScreenProps) => {
  const [clubs, setClubs] = useState<ReadonlyArray<ClubSelectionRow>>([]);
  const [leagueName, setLeagueName] = useState("");
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
      setLeagueName(outcome.success.leagueName);
      setLoading(false);
    };
    void load();
    return () => {
      live = false;
    };
  }, [saveId]);

  const summary = useMemo(() => leagueSummaryOf(clubs), [clubs]);
  const selectedClub = clubs.find((club) => club.clubId === selectedClubId) ?? null;

  const handleSelect = useCallback(
    (club: ClubSelectionRow | null): void => {
      onSelect(club === null ? null : { clubId: club.clubId, clubName: club.clubName });
      setAnnouncement(club === null ? "" : `The panel shows ${club.clubName}.`);
    },
    [onSelect],
  );

  /**
   * The assist. Unseeded by design: the suggestion is never persisted and nothing downstream reads
   * it, so seeding it would mean carrying the world seed into the renderer for a reproducibility
   * nobody consumes. It excludes the current pick so a press always changes something, and it
   * selects-and-stays — focus never leaves the button, and the live region says what changed.
   */
  const handlePick = useCallback((): void => {
    const club = rollClub(clubs, selectedClubId, Math.random);
    if (club === null) return;
    onSelect({ clubId: club.clubId, clubName: club.clubName });
    setAnnouncement(`Picked ${club.clubName}. The panel shows ${club.clubName}.`);
  }, [clubs, onSelect, selectedClubId]);

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="flex min-h-0 w-80 shrink-0 flex-col gap-2">
        <LeagueSelector leagueName={leagueName} />

        <ClubRail
          clubs={clubs}
          loading={loading}
          error={error}
          selectedClubId={selectedClubId}
          onSelect={handleSelect}
        />

        {/* Subdued and below the list: the screen's real decision is picking by hand, and an
            assist must not compete with the rows. Disabled while the rail has nothing to pick
            from, so a press can never roll over zero rows. */}
        <Button
          type="button"
          variant="secondary"
          onClick={handlePick}
          disabled={clubs.length === 0}
          className="shrink-0"
        >
          Pick a team for me
        </Button>
      </div>

      <ClubDetailPanel club={selectedClub} summary={summary} announcement={announcement} />
    </div>
  );
};
