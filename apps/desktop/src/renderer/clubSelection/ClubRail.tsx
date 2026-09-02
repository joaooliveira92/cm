import { useCallback, useRef, useState } from "react";
import type { ClubId, ClubSelectionRow } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Skeleton } from "../components/ui/skeleton.js";
import { FOCUS_RING, focusIdOf, rovingTabIndex } from "../focus.js";
import { PANEL } from "../theme.js";
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

/**
 * The club list: a bespoke `role="listbox"` on the renderer's roving primitives, not a
 * `DataTable`. The table layer is TanStack column machinery — sortable headers, pinned cells,
 * dense-table styling — and this is a flat three-fact list with no headers, columns or sorting, so
 * wrapping it would drag all of that along unused. `mainMenu.tsx` is the lighter-weight roving
 * precedent this follows: real focus moves with the tab stop, never `aria-activedescendant`.
 *
 * Focus and selection stay separate: ↑/↓ and Home/End move focus only, Enter selects the focused
 * row, Space toggles it. The row is coded selected three ways — fill, left accent bar, and a
 * marker beside the stature-tier badge, which it keeps — so selection survives being read without
 * colour, against the single focus ring.
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
          <Skeleton key={index} className="h-14 w-full" />
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
      role="listbox"
      aria-label="Clubs"
      tabIndex={-1}
      data-focus-id={focusIdOf("createStep2", "clubs")}
      onKeyDown={handleKeyDown}
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1"
    >
      {clubs.map((club) => {
        const selected = club.clubId === selectedClubId;
        return (
          <div
            key={club.clubId}
            role="option"
            aria-selected={selected}
            tabIndex={rovingTabIndex(tabStopId, club.clubId)}
            ref={(node) => {
              rowRefs.current.set(club.clubId, node);
            }}
            data-focus-id={focusIdOf("createStep2", "clubs", club.clubId)}
            onFocus={() => setActiveClubId(club.clubId)}
            onClick={() => onSelect(club)}
            className={`${PANEL} flex cursor-pointer items-center gap-3 border-l-4 ${
              selected ? "bg-row-selected border-l-text-highlight" : "border-l-transparent hover:bg-row-hover"
            } ${FOCUS_RING.join(" ")}`}
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
              {club.clubName}
            </span>

            <span className="flex items-center gap-1">
              <Badge variant="outline">{club.statureTier}</Badge>
              {selected && <Badge variant="success">Selected</Badge>}
            </span>

            <span className="flex items-center gap-2">
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
              <span className="w-24 text-2xs tracking-wide text-text-muted uppercase">
                {club.squadQualityBand}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
