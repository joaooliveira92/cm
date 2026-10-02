import type { TacticSlot } from "@cm-clone/contracts";
import { COLUMNS, DEFAULT_SUB, ROWS, slotLabel, type Slot } from "@cm-clone/shared";
import { dropZoneAt, type DropZone, type PitchSpot } from "./pitchLayout.js";

/**
 * The rules for moving a slot around the pitch, with no React and no DOM in them, so the pointer and
 * the keyboard are held to the same law and both can be checked without rendering anything. A drag
 * or an arrow ends in a `SlotMove`, which the component hands to `onSwap` or `onMove`.
 */
/** A drag's pointer on the pitch: `x`/`y` in the percent box `pitchLayout` draws in, plus the
 *  pitch's size in pixels, since a marker's reach is measured on screen, not in percent. */
export interface PitchPoint {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where, in pixels, the pointer held a marker relative to its disc's centre when the drag began.
 *  Grabbing the caption puts the pointer below the disc; the drop subtracts this so the disc lands
 *  where it was drawn under the pointer, not with its centre jumping to the pointer. */
export interface GrabOffset {
  readonly x: number;
  readonly y: number;
}

/** The grab of a drag the pointer did not hold off the disc's centre. */
export const NO_GRAB: GrabOffset = { x: 0, y: 0 };

/** How far from a disc's centre, in pixels, a drop still lands on that marker: the disc's radius
 *  plus a little slack. Past it is grass, so even a crowded line has room to move into. */
export const DISC_REACH = 20;

/** A step on the grid: `row` +1 is one line forward (up the screen), `column` +1 one place to the
 *  right. */
export interface SlotStep {
  readonly row: number;
  readonly column: number;
}

const ARROW_STEP: Readonly<Record<string, SlotStep>> = {
  ArrowUp: { row: 1, column: 0 },
  ArrowDown: { row: -1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
};

/** The step a key names, or `undefined` for every key that is not one of the four arrows. */
export const arrowStepOf = (key: string): SlotStep | undefined => ARROW_STEP[key];

/** What the pitch knows about the eleven that a move has to be resolved against: where every slot
 *  stands, and whether a player is in it. A swap's order turns on the second, so both go together. */
export interface PitchState {
  readonly slots: ReadonlyArray<TacticSlot>;
  readonly spots: ReadonlyArray<PitchSpot>;
  readonly hasPlayer: (slotIndex: number) => boolean;
}

/** Two slots trading places, in the order the move applies: the slot with a player in it hands over
 *  its cell first. A drop and a Shift+arrow both read it this way, so the player under the pointer
 *  is the one who travels. */
export interface SlotSwap {
  readonly kind: "swap";
  readonly from: number;
  readonly to: number;
}

/** One slot set down at a cell, at a sub-position within it: a drop where it was released, an
 *  arrow's nudge, or a click on a free cell. */
export interface SlotPlacement {
  readonly kind: "place";
  readonly slotIndex: number;
  readonly cell: Slot;
  readonly subRow: number;
  readonly subCol: number;
}

/** A change to the eleven. Both inputs that can move a slot, a drag and a key, describe one. */
export type SlotMove = SlotSwap | SlotPlacement;

/** What a drag's pointer is over: another slot to swap with, a place to set the dragged slot down,
 *  or nothing, where it already stands or in the keeper's end. A preview, so a swap names the slot
 *  found rather than the pair it trades with. `moveFor` puts that order back. */
export type DropIntent =
  | { readonly kind: "swap"; readonly slotIndex: number }
  | { readonly kind: "place"; readonly zone: DropZone }
  | null;

/** Two intents that mean the same thing as one string, so a drag hovering a whole cell reports one
 *  intent rather than a new one per pixel. */
export const intentKey = (intent: DropIntent): string =>
  intent === null ? "" : intent.kind === "swap"
      ? `swap ${intent.slotIndex}`
      : `place ${slotLabel(intent.zone.cell)} ${intent.zone.subRow} ${intent.zone.subCol}`;

const sameCell = (a: Slot, b: Slot): boolean => a.row === b.row && a.column === b.column;

/** The 31 grid cells, each that is empty of any slot. */
const ALL_CELLS: ReadonlyArray<Slot> = [
  { row: "GK", column: "C" },
  ...(["SW", "D", "DM", "M", "AM", "F"] as const).flatMap((row) =>
    (["L", "LC", "C", "RC", "R"] as const).map((column) => ({ row, column } as Slot)),
  ),
];

/** The labels of the cells the eleven stands in, so a rule can ask whether a cell is taken without
 *  walking the slots again. */
export const occupiedLabels = (slots: ReadonlyArray<TacticSlot>): ReadonlySet<string> =>
  new Set(slots.map((slot) => slotLabel(slot.cell)));

/** The free cells a slot could be moved to: every cell but its own and the ones other slots hold,
 *  and on the far side of the halfway line from itself, since a keeper only keeps goal and an
 *  outfield slot never drops back into it. */
export const eligibleCells = (
  selected: Slot | null,
  occupied: ReadonlySet<string>,
): ReadonlyArray<Slot> => {
  if (selected === null) return [];
  const current = slotLabel(selected);
  return ALL_CELLS.filter((cell) => {
    if (cell.row === "GK" && selected.row !== "GK") return false;
    if (cell.row !== "GK" && selected.row === "GK") return false;
    const label = slotLabel(cell);
    return label !== current && !occupied.has(label);
  });
};

/** Every cell a run could be set to but the slot's own. A run crosses lines, so the keeper's row
 *  and the cells the eleven already holds are all fair game for one. */
export const runTargetCells = (selected: Slot): ReadonlyArray<Slot> =>
  ALL_CELLS.filter((cell) => slotLabel(cell) !== slotLabel(selected));

/** What a drop at a point would do, given the slot being dragged: swap with the marker under the
 *  pointer (or with the slot holding the cell it falls in, since a cell holds one slot), set the
 *  dragged slot down where it was released, or nothing. */
export const intentAt = (point: PitchPoint | null, from: number | null, state: PitchState): DropIntent => {
  if (point === null || from === null) return null;
  const { slots, spots, hasPlayer } = state;
  const under = (slotIndex: number): DropIntent =>
    hasPlayer(from) || hasPlayer(slotIndex) ? { kind: "swap", slotIndex } : null;
  const hit = spots.find(
    (spot) =>
      spot.slotIndex !== from &&
      Math.hypot(((spot.x - point.x) / 100) * point.width, ((spot.y - point.y) / 100) * point.height) <=
        DISC_REACH,
    );
  if (hit !== undefined) return under(hit.slotIndex);
  const current = slots[from]!;
  if (current.cell.row === "GK") return null;
  const zone = dropZoneAt(point.x, point.y);
  if (zone === null) return null;
  // Moving onto grass another slot's cell covers would put two slots in one cell, which the
  // server refuses; the cell is that slot's, so the drop swaps with it instead.
  const occupant = slots.findIndex((slot, index) => index !== from && sameCell(slot.cell, zone.cell));
  if (occupant !== -1) return under(occupant);
  const unmoved =
    sameCell(current.cell, zone.cell) && current.subRow === zone.subRow && current.subCol === zone.subCol;
  return unmoved ? null : { kind: "place", zone };
};

/** Two slots trading places, or nothing when neither holds a player: there is no player to move, so
 *  a swap would shuffle two vacancies and read on the pitch as nothing happening. */
const swapBetween = (from: number, to: number, hasPlayer: (slotIndex: number) => boolean): SlotMove | null =>
  hasPlayer(from) ? { kind: "swap", from, to } : hasPlayer(to) ? { kind: "swap", from: to, to: from } : null;

/** The change a drag's preview stands for, with the swap's two slots in the order they trade. */
export const moveFor = (intent: DropIntent, from: number, state: PitchState): SlotMove | null => {
  if (intent === null) return null;
  if (intent.kind === "swap") return swapBetween(from, intent.slotIndex, state.hasPlayer);
  const { cell, subRow, subCol } = intent.zone;
  return { kind: "place", slotIndex: from, cell, subRow, subCol };
};

/** The outfield cell one step from `cell`, or `null` off the grid or into the keeper's row. */
const stepCell = (cell: Slot, step: SlotStep): Slot | null => {
  const row = ROWS[ROWS.indexOf(cell.row) + step.row];
  const column = COLUMNS[COLUMNS.indexOf(cell.column) + step.column];
  return row === undefined || row === "GK" || column === undefined ? null : ({ row, column } as Slot);
};

/** Shift+arrow: the selected slot one cell over, or a swap with the slot already holding that cell. */
export const cellStepMove = (slotIndex: number, step: SlotStep, state: PitchState): SlotMove | null => {
  const { slots } = state;
  const slot = slots[slotIndex]!;
  if (slot.cell.row === "GK") return null;
  const target = stepCell(slot.cell, step);
  if (target === null) return null;
  const occupant = slots.findIndex((each, index) => index !== slotIndex && sameCell(each.cell, target));
  return occupant === -1
    ? { kind: "place", slotIndex, cell: target, subRow: DEFAULT_SUB, subCol: DEFAULT_SUB }
    : swapBetween(slotIndex, occupant, state.hasPlayer);
};

/** How far one Alt+arrow nudges a marker within its cell, as a share of the cell. */
const NUDGE = 0.1;

const clampSub = (sub: number): number => Math.round(Math.min(1, Math.max(0, sub)) * 1000) / 1000;

/** Alt+arrow: the selected slot nudged within its own cell, or nothing once it is against the edge,
 *  where a further press would not change the shape. */
export const nudgeMove = (slotIndex: number, step: SlotStep, state: PitchState): SlotMove | null => {
  const slot = state.slots[slotIndex]!;
  if (slot.cell.row === "GK") return null;
  const subRow = clampSub(slot.subRow - step.row * NUDGE);
  const subCol = clampSub(slot.subCol + step.column * NUDGE);
  return subRow === slot.subRow && subCol === slot.subCol
    ? null
    : { kind: "place", slotIndex, cell: slot.cell, subRow, subCol };
};
