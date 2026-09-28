/**
 * The match-day indicator both Squad layouts lead each row with: the slot a
 * player fills in the next match (the starter's position code, or `SB1`…) or
 * an empty chip for "not selected". One component, so the position list and
 * the table views cannot disagree about a player or name his state two ways.
 *
 * It reads the lineup draft the match-day bar edits, through a context of its
 * own rather than the Squad provider's: the table's column cell renders it,
 * and the column definitions are built inside the hook that feeds that
 * provider, so importing the provider here would close an import cycle.
 */
import { createContext, useContext } from "react";
import type { Tactic } from "@cm-clone/contracts";
import { lineupSlotsOf, type LineupSlot } from "./lineupEdits.js";

/** Player id → the slot the lineup draft puts him in. Players in no slot are absent. */
export type SlotByPlayer = ReadonlyMap<string, LineupSlot>;

export const slotByPlayerOf = (tactic: Tactic): SlotByPlayer =>
  new Map(
    lineupSlotsOf(tactic)
      .filter((slot) => slot.playerId !== null)
      .map((slot) => [String(slot.playerId), slot]),
  );

export const SlotByPlayerContext = createContext<SlotByPlayer>(new Map());

export const useSlotByPlayer = (): SlotByPlayer => useContext(SlotByPlayerContext);

/** The width the table reserves for the indicator column, in px: the chip plus the cell's padding. */
export const MATCH_DAY_COLUMN_WIDTH = 56;

/**
 * The chip. The code the eye reads is the slot's label; the state ("Playing
 * (DC)", "On the bench", "Not selected") is the accessible text, following the
 * status-runner convention: decoration is aria-hidden, the meaning is the text.
 *
 * Not a button. It is read-only (selection happens by dragging a row onto a
 * slot, or by swapping in the bar), and a control that ignored Enter and Space
 * would break the level-1 contract, and add a second tab stop to a row whose
 * one stop is the name button.
 */
export const SelectionIndicator = ({ slot }: { readonly slot: LineupSlot | null }) => {
  const labelled = slot === null ? "Not selected" : slot.kind === "bench"
    ? "On the bench"
    : `Playing (${slot.label})`;
  // Always drawn, filled or not, the way CM's row buttons sat at the head of every line: an empty
  // chip reads "not selected", not "missing control". Empty is a dashed outline with no fill, the
  // pitch's empty-slot idiom, so it holds its place without weighing as much as a filled chip.
  const tone = slot === null
    ? "border-dashed border-text-muted/60 text-transparent"
    : slot.kind === "bench"
      ? "chrome-gradient border-panel-border-dark text-text-bright shadow-chrome"
      : "border-text-highlight bg-text-highlight/15 text-text-highlight shadow-chrome";
  return (
    <span
      title={labelled}
      className={`inline-flex h-5 min-w-10 shrink-0 items-center justify-center rounded-control border px-1 font-mono text-2xs leading-none ${tone}`}
    >
      <span aria-hidden="true">{slot === null ? "" : slot.label}</span>
      <span className="sr-only">{labelled}</span>
    </span>
  );
};

/** The table's cell: the indicator for one row, against the live lineup draft. */
export const MatchDayCell = ({ rowId }: { readonly rowId: string }) => (
  <SelectionIndicator slot={useSlotByPlayer().get(rowId) ?? null} />
);
