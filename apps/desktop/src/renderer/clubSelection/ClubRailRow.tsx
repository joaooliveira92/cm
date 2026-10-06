import type { ClubId, ClubSelectionRow } from "@cm-clone/contracts";
import { Badge } from "../components/ui/badge.js";
import { ClubBadge } from "../components/shared/ClubBadge.js";
import { FOCUS_RING, focusIdOf } from "../focus.js";
import { CLUB_ROW_GRID } from "./club-grid.js";
import { SquadQualityMeter } from "./SquadQualityMeter.js";

export interface ClubRailRowProps {
  readonly club: ClubSelectionRow;
  readonly selected: boolean;
  readonly tabIndex: 0 | -1;
  readonly registerRow: (clubId: ClubId, node: HTMLDivElement | null) => void;
  readonly onFocusRow: (clubId: ClubId) => void;
  readonly onSelect: (club: ClubSelectionRow) => void;
}

/** One club in the table. Selection is coded by fill as well as `aria-selected`. */
export const ClubRailRow = ({ club, selected, tabIndex, registerRow, onFocusRow, onSelect }: ClubRailRowProps) => (
  <div
    role="row"
    aria-selected={selected}
    tabIndex={tabIndex}
    ref={(node) => {
      registerRow(club.clubId, node);
    }}
    data-focus-id={focusIdOf("createStep2", "clubs", club.clubId)}
    onFocus={() => onFocusRow(club.clubId)}
    onClick={() => onSelect(club)}
    className={`${CLUB_ROW_GRID} cursor-pointer border-t border-panel-border ${selected ? "bg-row-selected" : "hover:bg-row-hover"
      } ${FOCUS_RING.join(" ")}`}
  >
    <div role="cell" className="flex min-w-0 items-center">
      <ClubBadge
        badgeKey={club.badgeKey}
        colours={club.clubColours}
        clubName={club.clubName}
        size={24}
      />
      <span className="block pl-2 truncate text-body font-medium text-text-primary">
        {club.clubName}
      </span>
    </div>

    <div role="cell" className="flex min-w-0 items-center">
      <Badge variant="outline">{club.statureTier}</Badge>
    </div>

    <div role="cell" className="flex min-w-0 items-center">
      <SquadQualityMeter band={club.squadQualityBand} />
    </div>
  </div>
);
