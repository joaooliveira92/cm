import { COLUMNS, ROWS, type Column, type Row, type Slot } from "@cm-clone/shared";

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

/** A cell's spot: its row's line and its column's place, so slot order never moves a marker. */
export const spotOf = (cell: Slot): { readonly x: number; readonly y: number } => ({
  x: COLUMN_X[cell.column],
  y: ROW_Y[cell.row],
});

/** Every slot on its own cell's spot. Cells are distinct in a valid Tactic, so no two markers overlap. */
export const pitchLayout = (cells: ReadonlyArray<Slot>): ReadonlyArray<PitchSpot> =>
  cells.map((cell, slotIndex) => ({ slotIndex, ...spotOf(cell) }));

/** Past this depth is the keeper's end, which no outfield slot may move into. */
const KEEPER_END = (ROW_Y.SW + ROW_Y.GK) / 2;

/** The patch of grass that stands for one outfield cell, in the same percent box as `PitchSpot`: the
 *  band between the midpoints to the neighbouring rows, crossed with the band between the
 *  midpoints to the neighbouring columns. */
export interface DropZone {
  readonly cell: Slot;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const nearest = <T>(items: ReadonlyArray<T>, at: (item: T) => number, target: number): number =>
  items.reduce((best, item, index) => (Math.abs(at(item) - target) < Math.abs(at(items[best]!) - target) ? index : best), 0);

/** The zone a point on the pitch falls in: the nearest row, then the nearest column across it.
 *  `null` in the keeper's end. */
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
  return {
    cell: { row, column },
    left: before === undefined ? 0 : (COLUMN_X[before] + COLUMN_X[column]) / 2,
    right: after === undefined ? 100 : (COLUMN_X[column] + COLUMN_X[after]) / 2,
    top: above === undefined ? 0 : (ROW_Y[above] + ROW_Y[row]) / 2,
    bottom: below === undefined ? KEEPER_END : (ROW_Y[row] + ROW_Y[below]) / 2,
  };
};

/** The outfield cell a point on the pitch stands for, or `null` in the keeper's end. */
export const cellAt = (x: number, y: number): Slot | null => dropZoneAt(x, y)?.cell ?? null;
