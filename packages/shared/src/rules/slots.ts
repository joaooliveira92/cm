import { POSITION_WEIGHTS, type Attribute, type Position } from "./positions.js";

/**
 * The rows of Championship Manager 03/04's tactics grid, goalkeeper first, in pitch order. They
 * share their codes with the Line Ratings a player is rated against (see `LINES`), except that WB is
 * a line and never a row: CM's grid puts wing-backs in the wide D and DM cells. See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-slots-are-row-column-cells-weighted-by-row-and-width.md`.
 */
export const ROWS = ["GK", "SW", "D", "DM", "M", "AM", "F"] as const;
export type Row = (typeof ROWS)[number];

/** The grid's columns, left to right. LC, C and RC are the three central columns CM keeps apart. */
export const COLUMNS = ["L", "LC", "C", "RC", "R"] as const;
export type Column = (typeof COLUMNS)[number];

/**
 * One cell of the tactics grid. A slot is its own type, not a Position: two centre-backs are
 * `D LC` and `D RC`, not two copies of one Position. The goalkeeper cell has no column in CM; it is
 * represented canonically as `{ row: "GK", column: "C" }` and displayed as plain `GK`.
 */
export interface Slot {
  readonly row: Row;
  readonly column: Column;
}

export const GOALKEEPER_SLOT: Slot = { row: "GK", column: "C" };

/** All 31 cells: the goalkeeper cell, then each outfield row's five columns, in pitch order. */
export const SLOTS: ReadonlyArray<Slot> = [
  GOALKEEPER_SLOT,
  ...ROWS.filter((row) => row !== "GK").flatMap((row) => COLUMNS.map((column) => ({ row, column }))),
];

/** `GK`, `D RC`, `AM L`. */
export const slotLabel = (slot: Slot): string => (slot.row === "GK" ? "GK" : `${slot.row} ${slot.column}`);

/** Pitch order: by row from the goalkeeper forward, then by column left to right. */
export const compareSlots = (a: Slot, b: Slot): number =>
  ROWS.indexOf(a.row) - ROWS.indexOf(b.row) || COLUMNS.indexOf(a.column) - COLUMNS.indexOf(b.column);

export const isSameSlot = (a: Slot, b: Slot): boolean => a.row === b.row && a.column === b.column;

/** L and R are wide; LC, C and RC are central. */
export type Width = "wide" | "central";
export const widthOf = (column: Column): Width => (column === "L" || column === "R" ? "wide" : "central");

/** The phase each row feeds: GK, SW and D defend; DM and M hold midfield; AM and F attack. */
export type Phase = "defense" | "midfield" | "attack";
export const PHASE_OF_ROW: Record<Row, Phase> = {
  GK: "defense",
  SW: "defense",
  D: "defense",
  DM: "midfield",
  M: "midfield",
  AM: "attack",
  F: "attack",
};
export const phaseOfSlot = (slot: Slot): Phase => PHASE_OF_ROW[slot.row];

/**
 * The key of the Position Weights table a slot is rated against: its row and width. GK and SW have
 * one table each, since CM only ever places them centrally; every other row has a wide and a central
 * table. Twelve tables in all.
 */
export const WEIGHT_TABLES = [
  "GK",
  "SW",
  "D-wide",
  "D-central",
  "DM-wide",
  "DM-central",
  "M-wide",
  "M-central",
  "AM-wide",
  "AM-central",
  "F-wide",
  "F-central",
] as const;
export type WeightTable = (typeof WEIGHT_TABLES)[number];

export const weightTableOf = (slot: Slot): WeightTable =>
  slot.row === "GK" || slot.row === "SW" ? slot.row : `${slot.row}-${widthOf(slot.column)}`;

/**
 * Position Weights by row and width. Eight tables carry over the ten-Position weights unchanged
 * (DL and DR, ML and MR were already identical). The four new ones — SW, DM wide (the wing-back),
 * AM wide and F wide — are design values, not research findings, and are expected to move under
 * balance testing. Like every weights table, they leave out bravery, aggression and the fitness and
 * injury attributes, so those never feed Position Rating, Overall Rating or Transfer Value.
 */
export const SLOT_WEIGHTS: Record<WeightTable, Partial<Record<Attribute, number>>> = {
  GK: POSITION_WEIGHTS.GK,
  SW: { positioning: 3, decisions: 3, tackling: 2, passing: 2, composure: 2, heading: 1 },
  "D-wide": POSITION_WEIGHTS.DR,
  "D-central": POSITION_WEIGHTS.DC,
  "DM-wide": { stamina: 3, pace: 2, crossing: 2, tackling: 2, acceleration: 1, dribbling: 1, positioning: 1 },
  "DM-central": POSITION_WEIGHTS.DM,
  "M-wide": POSITION_WEIGHTS.MR,
  "M-central": POSITION_WEIGHTS.MC,
  "AM-wide": { dribbling: 3, pace: 2, crossing: 2, acceleration: 2, flair: 1, finishing: 1 },
  "AM-central": POSITION_WEIGHTS.AMC,
  "F-wide": { finishing: 2, dribbling: 2, pace: 2, acceleration: 2, shooting: 1, flair: 1, composure: 1 },
  "F-central": POSITION_WEIGHTS.ST,
};

/**
 * Transitional: where each of today's ten Positions sits on the grid, so the Tactic's Position
 * slots can be rated as cells until the formations-and-instructions spec replaces the Tactic. That
 * spec deletes this mapping together with the `Position` type.
 */
export const POSITION_SLOT: Record<Position, Slot> = {
  GK: GOALKEEPER_SLOT,
  DC: { row: "D", column: "C" },
  DL: { row: "D", column: "L" },
  DR: { row: "D", column: "R" },
  DM: { row: "DM", column: "C" },
  MC: { row: "M", column: "C" },
  ML: { row: "M", column: "L" },
  MR: { row: "M", column: "R" },
  AMC: { row: "AM", column: "C" },
  ST: { row: "F", column: "C" },
};
