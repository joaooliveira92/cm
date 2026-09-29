import type { ClubId, ClubSelectionRow } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { focusIdOf, rovingTabIndex } from "../focus.js";
import { ClubRailHeader } from "./ClubRailHeader.js";
import { ClubRailRow } from "./ClubRailRow.js";
import { ClubRailSkeleton } from "./ClubRailSkeleton.js";
import { useClubRailRoving } from "./useClubRailRoving.js";

export interface ClubRailProps {
  readonly clubs: ReadonlyArray<ClubSelectionRow>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly selectedClubId: ClubId | null;
  /** Enter selects the focused row; Space on the selected row clears it. */
  readonly onSelect: (club: ClubSelectionRow | null) => void;
}

/**
 * The club list, presented as a dense table in the same grammar as the Active Leagues league grid:
 * a bordered container, a fixed header row of column labels, and one grid row per club. It reads
 * tabularly because the data is tabular — a stable club name against a fixed stature tier and a
 * squad-quality band — and the identity column stays flexible while the two derived columns hold
 * their width.
 *
 * Selection is a native roving tabindex over the rows (the renderer's `rovingTabIndex`), not an
 * ARIA grid: one row holds the tab stop, ↑/↓ and Home/End move focus only, Enter selects the
 * focused row, Space toggles it off. The row is coded selected beyond colour, and the header never
 * participates in roving.
 */
export const ClubRail = ({ clubs, loading, error, selectedClubId, onSelect }: ClubRailProps) => {
  const { tabStopId, registerRow, setActiveClubId, handleKeyDown } = useClubRailRoving(
    clubs,
    selectedClubId,
    onSelect,
  );

  if (loading) return <ClubRailSkeleton />;

  if (error !== null) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <Alert variant="destructive">{error}</Alert>
      </div>
    );
  }

  return (
    <div
      role="table"
      aria-label="Clubs"
      tabIndex={-1}
      data-focus-id={focusIdOf("createStep2", "clubs")}
      onKeyDown={handleKeyDown}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-panel-border bg-panel-bg"
    >
      <ClubRailHeader />

      <div role="rowgroup" className="min-h-0 flex-1 overflow-y-auto pr-1">
        {clubs.map((club) => (
          <ClubRailRow
            key={club.clubId}
            club={club}
            selected={club.clubId === selectedClubId}
            tabIndex={rovingTabIndex(tabStopId, club.clubId)}
            registerRow={registerRow}
            onFocusRow={setActiveClubId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};
