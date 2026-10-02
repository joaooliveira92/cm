import { COLUMNS, DEFAULT_SUB, ROWS, type Column, type Row, type Slot } from "@cm-clone/shared";

/** Where one Tactic slot sits on the pitch diagram, in percent of the pitch box: `x` from the left
 *  touchline, `y` from the opposition goal line (the club attacks up the screen). */
export interface PitchSpot {
  readonly slotIndex: number;
  readonly x: number;
  readonly y: number;
}

/** Each row's line up the pitch, forward first. The goalkeeper row is drawn but never a drop target. */
const ROW_Y: Record<Row, number> = { F: 13, AM: 27, M: 41, DM: 55, D: 69, SW: 79, GK: 88 };

/** Each column's place across the pitch, left flank to right flank. */
const COLUMN_X: Record<Column, number> = { L: 11, LC: 30, C: 50, RC: 70, R: 89 };

/** The outfield rows, forward first, as the drop zones tile them. */
const OUTFIELD_ROWS: ReadonlyArray<Exclude<Row, "GK">> = ROWS.filter(
  (row): row is Exclude<Row, "GK"> => row !== "GK",
).reverse();

/** Past this depth is the keeper's end, which no outfield slot may move into. */
const KEEPER_END = (ROW_Y.SW + ROW_Y.GK) / 2;

/** The pitch lines, in percent: `PitchBackground` draws the touchlines at 2/68 and the goal lines at
 *  2/100 in from each edge, so a marker is never placed on the grass outside them. */
const TOUCHLINE = { min: 3, max: 97 };
const GOAL_LINE = { min: 2, max: 98 };

/** One cell's extent along an axis: its centre, and the edges half-way to each neighbour (or the
 *  pitch line on the outside). The centre is not the middle of an outer cell, so a sub-position maps
 *  each half separately — 0.5 is always the centre, 0 and 1 the edges. */
interface Span {
  readonly low: number;
  readonly centre: number;
  readonly high: number;
}

const spanOf = (centres: ReadonlyArray<number>, index: number, bounds: { readonly min: number; readonly max: number }): Span => {
  const centre = centres[index]!;
  const before = centres[index - 1];
  const after = centres[index + 1];
  return {
    low: before === undefined ? bounds.min : (before + centre) / 2,
    centre,
    high: after === undefined ? bounds.max : (centre + after) / 2,
  };
};

const COLUMN_CENTRES = COLUMNS.map((column) => COLUMN_X[column]);
const columnSpan = (column: Column): Span => spanOf(COLUMN_CENTRES, COLUMNS.indexOf(column), TOUCHLINE);

const OUTFIELD_CENTRES = OUTFIELD_ROWS.map((row) => ROW_Y[row]);
const rowSpan = (row: Row): Span =>
  row === "GK"
    ? { low: KEEPER_END, centre: ROW_Y.GK, high: GOAL_LINE.max }
    : spanOf(OUTFIELD_CENTRES, OUTFIELD_ROWS.indexOf(row), { min: GOAL_LINE.min, max: KEEPER_END });

/** A 0-1 sub-position to a point in the span. */
const pointIn = ({ low, centre, high }: Span, sub: number): number =>
  sub <= DEFAULT_SUB ? low + (centre - low) * (sub / DEFAULT_SUB) : centre + (high - centre) * ((sub - DEFAULT_SUB) / (1 - DEFAULT_SUB));

/** A point to its 0-1 sub-position in the span, clamped to the edges and rounded to a thousandth. */
const subIn = ({ low, centre, high }: Span, at: number): number => {
  const sub = at <= centre ? DEFAULT_SUB * ((at - low) / (centre - low)) : DEFAULT_SUB + (1 - DEFAULT_SUB) * ((at - centre) / (high - centre));
  return Math.round(Math.min(1, Math.max(0, sub)) * 1000) / 1000;
};

/** A cell's spot, offset by the slot's sub-position within the cell: `subRow` 0 is the cell's edge
 *  nearest the opposition goal and 1 its edge nearest our own, `subCol` 0 its left edge and 1 its
 *  right. Both at `DEFAULT_SUB` is the cell's centre — the row's line and the column's place. */
export const spotOf = (cell: Slot, subRow = DEFAULT_SUB, subCol = DEFAULT_SUB): { readonly x: number; readonly y: number } => ({
  x: pointIn(columnSpan(cell.column), subCol),
  y: pointIn(rowSpan(cell.row), subRow),
});

/** An input for pitch layout computation: a cell and its visual offset. */
export interface CellPosition {
  readonly cell: Slot;
  readonly subRow: number;
  readonly subCol: number;
}

/** Every slot on its own cell's spot, offset by its sub-position. Cells are distinct in a valid
 *  Tactic and a sub-position never leaves its cell, so no two markers share a spot. */
export const pitchLayout = (positions: ReadonlyArray<CellPosition>): ReadonlyArray<PitchSpot> =>
  positions.map(({ cell, subRow, subCol }, slotIndex) => ({ slotIndex, ...spotOf(cell, subRow, subCol) }));

/** The outfield cell a point on the pitch falls in, and the point as a sub-position within it —
 *  the same 0-1 fractions `spotOf` reads, so a drop is drawn exactly where it was released. */
export interface DropZone {
  readonly cell: Slot;
  readonly subRow: number;
  readonly subCol: number;
}

const nearest = <T>(items: ReadonlyArray<T>, at: (item: T) => number, target: number): number =>
  items.reduce((best, item, index) => (Math.abs(at(item) - target) < Math.abs(at(items[best]!) - target) ? index : best), 0);

export const dropZoneAt = (x: number, y: number): DropZone | null => {
  if (y > KEEPER_END) return null;
  const row = OUTFIELD_ROWS[nearest(OUTFIELD_ROWS, (each) => ROW_Y[each], y)]!;
  const column = COLUMNS[nearest(COLUMNS, (each) => COLUMN_X[each], x)]!;
  return {
    cell: { row, column } as Slot,
    subRow: subIn(rowSpan(row), y),
    subCol: subIn(columnSpan(column), x),
  };
};

/** The outfield cell a point on the pitch stands for, or `null` in the keeper's end. */
export const cellAt = (x: number, y: number): Slot | null => dropZoneAt(x, y)?.cell ?? null;
