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

/** Compute pixel-level bounds for a cell — the midpoints between neighbouring rows and columns. */
const OUTFEILD_ROW_ABOVE = (row: Exclude<Row, "GK">): Exclude<Row, "GK"> | undefined => {
  const index = OUTFIELD_ROWS.indexOf(row);
  return OUTFIELD_ROWS[index - 1];
};
const OUTFEILD_ROW_BELOW = (row: Exclude<Row, "GK">): Exclude<Row, "GK"> | undefined => {
  const index = OUTFIELD_ROWS.indexOf(row);
  return OUTFIELD_ROWS[index + 1];
};
const COLUMN_BEFORE = (column: Column): Column | undefined => {
  const index = COLUMNS.indexOf(column);
  return COLUMNS[index - 1];
};
const COLUMN_AFTER = (column: Column): Column | undefined => {
  const index = COLUMNS.indexOf(column);
  return COLUMNS[index + 1];
};

interface CellBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Past this depth is the keeper's end, which no outfield slot may move into. */
const KEEPER_END = (ROW_Y.SW + ROW_Y.GK) / 2;

const cellBounds = (cell: Slot): CellBounds => {
  if (cell.row === "GK") {
    return { left: 0, right: 100, top: KEEPER_END, bottom: 100 };
  }
  const above = OUTFEILD_ROW_ABOVE(cell.row);
  const below = OUTFEILD_ROW_BELOW(cell.row);
  const before = COLUMN_BEFORE(cell.column);
  const after = COLUMN_AFTER(cell.column);
  return {
    left: before === undefined ? 0 : (COLUMN_X[before] + COLUMN_X[cell.column]) / 2,
    right: after === undefined ? 100 : (COLUMN_X[cell.column] + COLUMN_X[after]) / 2,
    top: above === undefined ? 0 : (ROW_Y[above] + ROW_Y[cell.row]) / 2,
    bottom: below === undefined ? KEEPER_END : (ROW_Y[cell.row] + ROW_Y[below]) / 2,
  };
};

/** A cell's spot: its row's line and column's place, offset by the sub-position within the cell.
 *  `subRow`/`subCol` are 0-1 fractions: 0 is the top/left bound, 0.5 is centre (the default),
 *  1 is the bottom/right bound. */
export const spotOf = (cell: Slot, subRow = DEFAULT_SUB, subCol = DEFAULT_SUB): { readonly x: number; readonly y: number } => {
  if (subRow === DEFAULT_SUB && subCol === DEFAULT_SUB) {
    return { x: COLUMN_X[cell.column], y: ROW_Y[cell.row] };
  }
  const bounds = cellBounds(cell);
  return {
    x: bounds.left + (bounds.right - bounds.left) * subCol,
    y: bounds.top + (bounds.bottom - bounds.top) * subRow,
  };
};

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

/** The patch of grass that stands for one outfield cell, in the same percent box as `PitchSpot`: the
 *  band between the midpoints to the neighbouring rows, crossed with the band between the
 *  midpoints to the neighbouring columns. `subRow`/`subCol` are the 0-1 position within the cell. */
export interface DropZone {
  readonly cell: Slot;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
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
  const above = OUTFIELD_ROWS[rowIndex - 1];
  const below = OUTFIELD_ROWS[rowIndex + 1];
  const before = COLUMNS[columnIndex - 1];
  const after = COLUMNS[columnIndex + 1];
  const left = before === undefined ? 0 : (COLUMN_X[before] + COLUMN_X[column]) / 2;
  const right = after === undefined ? 100 : (COLUMN_X[column] + COLUMN_X[after]) / 2;
  const top = above === undefined ? 0 : (ROW_Y[above] + ROW_Y[row]) / 2;
  const bottom = below === undefined ? KEEPER_END : (ROW_Y[row] + ROW_Y[below]) / 2;
  const cell = { row, column } as Slot;
  return {
    cell,
    left, right, top, bottom,
    subRow: (y - top) / (bottom - top),
    subCol: (x - left) / (right - left),
  };
};

/** The outfield cell a point on the pitch stands for, or `null` in the keeper's end. */
export const cellAt = (x: number, y: number): Slot | null => dropZoneAt(x, y)?.cell ?? null;
