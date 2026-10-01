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

/** A cell's spot: its row's line and column's place, or the raw pitch coordinate if the user has
 *  positioned it. `subRow`/`subCol` are 0-100 percentages of the pitch diagram — either the cell
 *  centre (when both are the sentinel `DEFAULT_SUB`) or the raw drop coordinates. */
export const spotOf = (cell: Slot, subRow = DEFAULT_SUB, subCol = DEFAULT_SUB): { readonly x: number; readonly y: number } => {
  if (subRow === DEFAULT_SUB && subCol === DEFAULT_SUB) {
    return { x: COLUMN_X[cell.column], y: ROW_Y[cell.row] };
  }
  return { x: subCol, y: subRow };
};

/** An input for pitch layout computation: a cell and its visual offset. */
/** An input for pitch layout computation: a cell and its visual offset. */
export interface CellPosition {
  readonly cell: Slot;
  readonly subRow: number;
  readonly subCol: number;
}

/** Every slot on its own cell's spot, offset by its sub-position. Cells are distinct in a valid
 *  Tactic, so no two markers overlap. */
export const pitchLayout = (positions: ReadonlyArray<CellPosition>): ReadonlyArray<PitchSpot> =>
  positions.map(({ cell, subRow, subCol }, slotIndex) => ({ slotIndex, ...spotOf(cell, subRow, subCol) }));

/** The nearest outfield cell and the raw click position. `subRow`/`subCol` are 0-100 percentages of
 *  the pitch diagram — the exact point the user dropped at, not a cell-relative fraction. */
export interface DropZone {
  readonly cell: Slot;
  readonly subRow: number;
  readonly subCol: number;
}

const nearest = <T>(items: ReadonlyArray<T>, at: (item: T) => number, target: number): number =>
  items.reduce((best, item, index) => (Math.abs(at(item) - target) < Math.abs(at(items[best]!) - target) ? index : best), 0);

export const dropZoneAt = (x: number, y: number): DropZone | null => {
  if (y > KEEPER_END) return null;
  const rowIndex = nearest(OUTFIELD_ROWS, (row) => ROW_Y[row], y);
  const row = OUTFIELD_ROWS[rowIndex]!;
  const columnIndex = nearest(COLUMNS, (column) => COLUMN_X[column], x);
  const column = COLUMNS[columnIndex]!;
  return {
    cell: { row, column } as Slot,
    subRow: y,
    subCol: x,
  };
};

/** The outfield cell a point on the pitch stands for, or `null` in the keeper's end. */
export const cellAt = (x: number, y: number): Slot | null => dropZoneAt(x, y)?.cell ?? null;
