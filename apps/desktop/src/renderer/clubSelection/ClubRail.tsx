import { useCallback, useRef, useState } from "react";
import type { ClubId, ClubSelectionRow } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Skeleton } from "../components/ui/skeleton.js";
import { FOCUS_RING, focusIdOf, rovingTabIndex } from "../focus.js";
import { QUALITY_SEGMENTS, filledSegments } from "./model.js";

export interface ClubRailProps {
  readonly clubs: ReadonlyArray<ClubSelectionRow>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly selectedClubId: ClubId | null;
  /** Enter selects the focused row; Space on the selected row clears it. */
  readonly onSelect: (club: ClubSelectionRow | null) => void;
}

const SKELETON_ROWS = 6;

/** The club table's CSS-Grid columns: identity, stature, squad quality. The identity column takes
 *  the flexible width; stature and quality stay fixed so their labels and badges never wrap. */
const CLUB_GRID_TEMPLATE = "grid-cols-[minmax(0,1fr)_4.5rem_6.5rem]";

const HEADER_ROW_CLASS = `grid items-center gap-2 px-3 py-1.5 ${CLUB_GRID_TEMPLATE}`;
const BODY_ROW_CLASS = `grid items-center gap-2 px-3 py-1.5 ${CLUB_GRID_TEMPLATE}`;

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
  const [activeClubId, setActiveClubId] = useState<ClubId | null>(null);
  const rowRefs = useRef(new Map<ClubId, HTMLDivElement | null>());

  /** The roving tab stop: the focused row, else the selected one, else the first row. */
  const tabStopId = activeClubId ?? selectedClubId ?? clubs[0]?.clubId ?? null;

  const focusRow = useCallback((clubId: ClubId | undefined): void => {
    if (clubId === undefined) return;
    setActiveClubId(clubId);
    rowRefs.current.get(clubId)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
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

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1" aria-busy="true">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
        <span className="sr-only">Loading clubs…</span>
      </div>
    );
  }

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
      <div
        role="row"
        className={`${HEADER_ROW_CLASS} border-b border-panel-border bg-surface-raised text-2xs font-semibold uppercase tracking-wider text-text-secondary`}
      >
        <div role="columnheader" className="min-w-0 truncate">
          Club
        </div>
        <div role="columnheader" className="min-w-0 truncate">
          Stature
        </div>
        <div role="columnheader" className="min-w-0 truncate">
          Squad
        </div>
      </div>

      <div role="rowgroup" className="min-h-0 flex-1 overflow-y-auto pr-1">
        {clubs.map((club) => {
          const selected = club.clubId === selectedClubId;
          return (
            <div
              key={club.clubId}
              role="row"
              aria-selected={selected}
              tabIndex={rovingTabIndex(tabStopId, club.clubId)}
              ref={(node) => {
                rowRefs.current.set(club.clubId, node);
              }}
              data-focus-id={focusIdOf("createStep2", "clubs", club.clubId)}
              onFocus={() => setActiveClubId(club.clubId)}
              onClick={() => onSelect(club)}
              className={`${BODY_ROW_CLASS} cursor-pointer border-t border-panel-border ${
                selected ? "bg-row-selected" : "hover:bg-row-hover"
              } ${FOCUS_RING.join(" ")}`}
            >
              <div role="cell" className="min-w-0">
                <span className="block truncate text-sm font-medium text-text-primary">
                  {club.clubName}
                </span>
              </div>

              <div role="cell" className="flex min-w-0 items-center gap-1">
                <Badge variant="outline">{club.statureTier}</Badge>
              </div>

              <div role="cell" className="flex min-w-0 items-center gap-2">
                {/* Decorative: the band's word carries the same fact in the accessible name. */}
                <span aria-hidden="true" className="flex gap-0.5">
                  {Array.from({ length: QUALITY_SEGMENTS }, (_, index) => (
                    <span
                      key={index}
                      className={`h-3 w-1.5 rounded-xs ${
                        index < filledSegments(club.squadQualityBand)
                          ? "bg-text-highlight"
                          : "bg-surface-raised"
                      }`}
                    />
                  ))}
                </span>
                <span className="truncate text-2xs tracking-wide text-text-muted uppercase">
                  {club.squadQualityBand}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
