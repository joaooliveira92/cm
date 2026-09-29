import { CLUB_ROW_GRID } from "./club-grid.js";

const COLUMNS = ["Club", "Stature", "Squad"] as const;

/** The table's column labels. Never part of the roving order. */
export const ClubRailHeader = () => (
  <div
    role="row"
    className={`${CLUB_ROW_GRID} border-b border-panel-border bg-surface-raised text-overline uppercase text-text-secondary`}
  >
    {COLUMNS.map((column) => (
      <div key={column} role="columnheader" className="min-w-0 truncate">
        {column}
      </div>
    ))}
  </div>
);
