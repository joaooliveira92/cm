/**
 * The Squad screen's position list — the layout CM 03/04 opened a career on:
 * every player at once, two balanced columns, each row a leading match-day
 * indicator (playing, on the bench, or not selected), a status slot, a name,
 * and the positions that player can fill. The status slot carries what bears
 * on the next match — injured, suspended, away with the national team — and
 * keeps its width when empty, so the names line up down each column whether
 * or not anyone has a status. It is the "who is in this squad"
 * reading; the table views are the "how good are they at X" readings.
 *
 * Each column is a headerless `Table` from the shared primitives (the reui
 * c-table-7 pattern), so the rows take the striping, hover and selection the
 * table views use rather than a copy of them. It has no header row: sorting
 * lives in the toolbar's Sort control, and the ordering comes from the same
 * TanStack table the table views render, so that control and the command
 * palette drive both layouts identically and the sort survives a view change.
 * The tables carry `data-squad-layout="positions"`, which is how tests tell
 * this layout from the table views.
 *
 * Focus follows the table's model exactly (note: Navigation model, AC-28): one
 * focusable control per row — the name button — carrying the same
 * `data-focus-id` the table gives it, so a focus bookmark survives a view
 * change. ArrowUp/Down rove down a column, ArrowLeft/Right cross between the
 * two columns at the same offset, Home/End jump to the ends, Space toggles
 * selection, Enter runs the row's primary action — opening that player's
 * player screen, which is what clicking the name does too.
 */
import { Table, TableBody, TableCell, TableRow } from "../components/ui/table.js";
import { FOCUS_RING, focusIdOf, rovingTabIndex } from "../focus.js";
import {
  STATUS_COLUMN_WIDTH,
  StatusCell,
  statusesOf,
} from "../table/squad/playerStatus.js";
import type { SquadRow } from "../table/squad/squadColumns.js";
import { writeLineupDrag } from "./lineupDrag.js";
import { FIT_COLUMN_WIDTH, FitIndicator } from "./FitIndicator.js";
import { useSquad } from "./SquadProvider.js";
import { SelectionIndicator, useSlotByPlayer } from "./SelectionIndicator.js";

const REGION = "squadTable";

/** Where the left column ends. The left column is the longer one on an odd
 *  count, so the list reads top-left to bottom-right without a gap. */
export const leftColumnLength = (total: number): number => Math.ceil(total / 2);

/**
 * The keyboard move a key requests, as an index into the ordered rows, or
 * `null` when the key is not ours. Pure so the two-column geometry — down the
 * column, across at the same offset, wrapping at the ends — is unit-testable
 * without a DOM.
 */
export const nextPositionIndex = (
  key: string,
  current: number,
  total: number,
): number | null => {
  if (total === 0) return null;
  const split = leftColumnLength(total);
  switch (key) {
    case "ArrowDown":
      return (current + 1) % total;
    case "ArrowUp":
      return (current - 1 + total) % total;
    case "ArrowRight":
      // Right of a left-column row is the row at the same offset on the right;
      // right of a right-column row is nothing, so focus stays put.
      return current < split ? Math.min(current + split, total - 1) : current;
    case "ArrowLeft":
      return current >= split ? current - split : current;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
};

/** The player's CM position label (`D/DM RC`), read off the row. */
const PositionRunner = ({ row }: { readonly row: SquadRow }) => (
  <span className="flex justify-end text-data font-medium text-text-secondary">{row.positionLabel === "" ? "—" : row.positionLabel}</span>
);

export const SquadPositionList = () => {
  const { state, actions } = useSquad();
  const { orderedIds, rows: displayRows, activeId, selectedId, announcement, refreshState } = state;
  const { onActiveChange, onToggleSelection, onRowPrimary, openPlayer, setBookmark } = actions;

  const rows = displayRows.map((row) => row.original);
  const effectiveActive = activeId ?? orderedIds[0] ?? null;
  const split = leftColumnLength(rows.length);

  // The match-day assignment each roster row reports against. Mirrors the
  // bar's slots live, so dragging a player onto a slot flips their indicator.
  const slotByPlayer = useSlotByPlayer();

  const focusRow = (id: string): void => {
    (
      document.querySelector(
        `[data-focus-id="${focusIdOf("squad", REGION, id)}"]`,
      ) as HTMLElement | null
    )?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const current = effectiveActive === null ? -1 : orderedIds.indexOf(effectiveActive);
    // Space/Enter are the row's selection/primary actions, owned by the roving
    // name button. Guard on the roving stop's `data-focus-id` so a future
    // focusable control in a row keeps its own Space/Enter semantics instead of
    // inheriting the row's.
    if (event.key === " " || event.key === "Enter") {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof HTMLElement) || target.dataset.focusId === undefined) return;
      event.preventDefault();
      if (effectiveActive === null) return;
      if (event.key === " ") onToggleSelection(effectiveActive);
      else onRowPrimary(effectiveActive);
      return;
    }
    const next = nextPositionIndex(event.key, current === -1 ? 0 : current, orderedIds.length);
    if (next === null) return;
    event.preventDefault();
    const nextId = orderedIds[next];
    if (nextId === undefined) return;
    setBookmark({
      tableId: "squad",
      itemId: nextId,
      previousItemId: orderedIds[next - 1],
      nextItemId: orderedIds[next + 1],
    });
    onActiveChange(nextId);
    focusRow(nextId);
  };

  /** One of the two columns. The gap between them separates them; there is no divider. */
  const column = (slice: readonly SquadRow[], label: string) => (
    <div className="min-w-0 flex-1">
      <Table data-squad-layout="positions" aria-label={label}>
        <TableBody>
          {slice.map((row) => (
            <TableRow
              key={row.id}
              aria-selected={selectedId === row.id || undefined}
              className="h-9"
            >
              <TableCell className="w-px">
                <SelectionIndicator slot={slotByPlayer.get(row.id) ?? null} />
              </TableCell>
              {/* The same width the table's fit column reserves, so a mark appearing on
                  some rows never shifts the names that follow it. Empty while no slot
                  is selected — the reserved width is the price of a steady list. */}
              <TableCell style={{ width: FIT_COLUMN_WIDTH }}>
                <span className="flex justify-center">
                  <FitIndicator rowId={row.id} />
                </span>
              </TableCell>
              {/* The same width the table's Status column reserves, so a status
                  appearing never pushes the name right. */}
              <TableCell style={{ width: STATUS_COLUMN_WIDTH }}>
                <StatusCell statuses={statusesOf(row)} />
              </TableCell>
              {/* `w-full max-w-0` lets the name column take the slack and truncate
                  instead of widening the table past its half of the screen. */}
              <TableCell className="w-full max-w-0">
                <button
                  type="button"
                  data-focus-id={focusIdOf("squad", REGION, row.id)}
                  tabIndex={rovingTabIndex(effectiveActive, row.id)}
                  draggable
                  onDragStart={(event) => writeLineupDrag(event, "roster", row.id)}
                  onFocus={() => {
                    if (activeId !== row.id) onActiveChange(row.id);
                  }}
                  onClick={(event) => openPlayer(row.id, event)}
                  className={`block max-w-full truncate text-left text-body font-semibold text-text-bright ${FOCUS_RING.join(" ")}`}
                >
                  {row.lastName}, {row.firstName}
                </button>
              </TableCell>
              <TableCell className="w-px whitespace-nowrap">
                <PositionRunner row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div
      role="group"
      aria-label="Squad"
      aria-busy={refreshState._tag === "Refreshing" || undefined}
      className="mt-1.5"
    >
      {rows.length > 0 && (
        // The container listens for keys but is not itself a tab stop: the
        // roving stops are the name buttons inside it, and this handler only
        // routes the keys they bubble.
        <div
          className="flex gap-6"
          onKeyDown={onKeyDown}
        >
          {column(rows.slice(0, split), "Squad, left column")}
          {column(rows.slice(split), "Squad, right column")}
        </div>
      )}
      {/* The same one polite announcer the table layout carries (AC-32), so a
          sort, filter or selection is spoken in whichever view is on screen. */}
      <div role="status" aria-live="polite">
        {announcement?.message ?? ""}
      </div>
    </div>
  );
};
