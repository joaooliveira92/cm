/**
 * The Squad screen's position list — the layout CM 03/04 opened a career on:
 * every player at once, two balanced columns, each row a leading match-day
 * indicator (playing, on the bench, or not selected), a status runner, a name,
 * and the positions that player can fill. It is the "who is in this squad"
 * reading; the table views are the "how good are they at X" readings.
 *
 * It is a list, not a table, and deliberately so: there is one column of data
 * beside the name, so a `<table>` would buy a header row, per-column sorting
 * semantics and a grid navigation model for a single field. Sorting and
 * filtering still apply — the ordering comes from the same TanStack table the
 * table views render, so the toolbar and the command palette drive both
 * layouts identically.
 *
 * Focus follows the table's model exactly (note: Navigation model, AC-28): one
 * focusable control per row — the name button — carrying the same
 * `data-focus-id` the table gives it, so a focus bookmark survives a view
 * change. ArrowUp/Down rove down a column, ArrowLeft/Right cross between the
 * two columns at the same offset, Home/End jump to the ends, Space toggles
 * selection, Enter runs the row's primary action.
 */
import type { FamiliarityTier } from "@cm-clone/shared";
import { FOCUS_RING, focusIdOf, rovingTabIndex } from "../focus.js";
import { StatusCell, statusesOf } from "../table/squad/playerStatus.js";
import type { SquadRow } from "../table/squad/squadColumns.js";
import type { LineupSlot } from "./lineupEdits.js";
import { lineupSlotsOf } from "./lineupEdits.js";
import { writeLineupDrag } from "./lineupDrag.js";
import { useSquad } from "./SquadProvider.js";

const REGION = "squadTable";

/** Where the left column ends. The left column is the longer one on an odd
 *  count, so the list reads top-left to bottom-right without a gap. */
export const leftColumnLength = (total: number): number => Math.ceil(total / 2);

/** Whether a second column gets the divider that separates it from the first.
 *  `true` only when the split leaves rows to the right; a split with nothing
 *  on the right (one player, or zero) is a solo list and draws no border.
 *  Pure so a call reading `variantOf(split, total)` needs no comment. */
const variantOf = (split: number, total: number): "leading" | "trailing" =>
  split < total ? "trailing" : "leading";

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

/** The tone a Familiarity Tier reads in: a Natural position is the one the eye
 *  should land on, an Unfamiliar one is present but recessive. Keyed by the
 *  shared tier values, so a renamed tier fails to compile rather than falling
 *  silently back to the neutral tone. */
const FAMILIARITY_TONE: Readonly<Record<FamiliarityTier, string>> = {
  natural: "text-text-highlight",
  competent: "text-text-body",
  unfamiliar: "text-text-muted",
};

/** Sentence case for a tier in a tooltip ("natural" → "Natural"). UI copy. */
const tierLabel = (tier: string): string => tier.charAt(0).toUpperCase() + tier.slice(1);

/** The leading match-day indicator: a compact box, one per roster row, that
 *  reports whether the player is selected to play or sit on the bench, against
 *  the same lineup slots the bottom bar edits. Read-only — selection happens by
 *  dragging the row onto a slot, or by Swapping in the bar. The code the eye
 *  reads is the slot's label, and the state ("playing", "on the bench", "not
 *  selected") is the accessible name, following the status-runner convention:
 *  decoration is aria-hidden, the meaning is the text. */
const SelectionIndicator = ({ slot }: { readonly slot: LineupSlot | null }) => {
  const labelled = slot === null ? "Not selected" : slot.kind === "bench"
    ? "On the bench"
    : `Playing (${slot.label})`;
  const tone = slot === null
    ? "border-border-subtle text-transparent"
    : slot.kind === "bench"
      ? "border-border-subtle bg-surface-raised text-text-secondary"
      : "border-text-highlight bg-text-highlight/15 text-text-highlight";
  return (
    <span
      role="img"
      aria-label={labelled}
      title={labelled}
      className={`flex h-5 min-w-9 shrink-0 items-center justify-center rounded-control border px-1 font-mono text-xs leading-none ${tone} ${FOCUS_RING.join(" ")}`}
    >
      {slot === null ? "" : slot.kind === "bench" ? "Sub" : slot.label}
    </span>
  );
};

const PositionRunner = ({ row }: { readonly row: SquadRow }) => (
  <span className="ml-auto flex shrink-0 gap-1 font-mono text-xs">
    {row.positions.length === 0 ? (
      <span className="text-text-muted">—</span>
    ) : (
      row.positions.map((p) => (
        <span
          key={p.position}
          className={FAMILIARITY_TONE[p.familiarity as FamiliarityTier] ?? "text-text-body"}
          title={`${p.position}: ${tierLabel(p.familiarity)}`}
        >
          {p.position}
        </span>
      ))
    )}
  </span>
);

export const SquadPositionList = () => {
  const { state, actions, lineup } = useSquad();
  const { orderedIds, activeId, selectedId, announcement, refreshState, table } = state;
  const { onActiveChange, onToggleSelection, onRowPrimary, setBookmark } = actions;

  const rows = table.getRowModel().rows.map((row) => row.original);
  const effectiveActive = activeId ?? orderedIds[0] ?? null;
  const split = leftColumnLength(rows.length);

  // The match-day assignment each roster row reports against: player id → the
  // slot they are selected into. Mirrors the bar's slots live, so dragging a
  // player onto a slot flips their indicator and swapping is not even needed
  // to keep the list honest.
  const slotByPlayer = new Map(
    lineupSlotsOf(lineup.tactic)
      .filter((slot) => slot.playerId !== null)
      .map((slot) => [String(slot.playerId), slot]),
  );

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

  /**
   * One of the two columns. A trailing column (the second of a two-column
   * squad) draws the divider that separates it from the first; a solo column
   * and a leading column do not. Expressed as an explicit variant rather than
   * a `rule: boolean` flag, so a reader cannot pair a bare true/false against
   * the border that follows.
   */
  const column = (slice: readonly SquadRow[], variant: "leading" | "trailing") => (
    <ul
      className={`min-w-0 flex-1 divide-y divide-border-subtle ${
        variant === "trailing" ? "border-l border-border-subtle pl-4" : ""
      }`}
    >
      {slice.map((row) => (
        <li
          key={row.id}
          aria-selected={selectedId === row.id || undefined}
          className="flex min-w-0 items-center gap-2 px-2 py-1 hover:bg-row-hover aria-selected:bg-row-selected"
        >
          <SelectionIndicator slot={slotByPlayer.get(row.id) ?? null} />
          <StatusCell statuses={statusesOf(row)} />
          <button
            type="button"
            data-focus-id={focusIdOf("squad", REGION, row.id)}
            tabIndex={rovingTabIndex(effectiveActive, row.id)}
            draggable
            onDragStart={(event) => writeLineupDrag(event, "roster", row.id)}
            onFocus={() => {
              if (activeId !== row.id) onActiveChange(row.id);
            }}
            onClick={() => onToggleSelection(row.id)}
            className={`truncate text-left font-semibold text-text-primary ${FOCUS_RING.join(" ")}`}
          >
            {row.lastName}, {row.firstName}
          </button>
          <PositionRunner row={row} />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      role="group"
      aria-label="Squad"
      aria-busy={refreshState._tag === "Refreshing" || undefined}
      className="mt-2"
    >
      {rows.length > 0 && (
        // The container listens for keys but is not itself a tab stop: the
        // roving stops are the name buttons inside it, and this handler only
        // routes the keys they bubble.
        <div
          className="flex gap-6 rounded-panel bg-panel-bg p-2"
          onKeyDown={onKeyDown}
        >
          {column(rows.slice(0, split), "leading")}
          {/* The rule between the columns is deliberate: a one-player squad is
              one list and draws no divider, but two columns of the same list
              read as two lists without it. */}
          {column(rows.slice(split), variantOf(split, rows.length))}
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
