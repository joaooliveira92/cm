import { describe, expect, it } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import {
  figureMid,
  formatCredits,
  formatFigure,
  formatFigureCredits,
} from "../../../../src/renderer/format.js";
import {
  MARKET_COLUMN_LABELS,
  marketColumns,
  marketPlayerRowOf,
  type MarketPlayerRow,
} from "../../../../src/renderer/table/transfers/marketColumns.js";

/** The value a column sorts by — the accessor function TanStack gives its rows (the midpoint, for
 *  ranged figures). Narrowed out of the `ColumnDef` union, which only carries `accessorFn` on the
 *  accessor variant. */
const accessorOf = (
  columns: ReadonlyArray<ColumnDef<MarketPlayerRow, unknown>>,
  id: string,
): ((row: MarketPlayerRow) => number) => {
  const column = columns.find((c) => c.id === id);
  if (column === undefined || !("accessorFn" in column) || typeof column.accessorFn !== "function") {
    throw new Error(`expected a functional accessor on column ${id}`);
  }
  return column.accessorFn as (row: MarketPlayerRow) => number;
};

const scouted = (overallRating: number, transferValue: number) => ({
  id: "p1",
  firstName: "Alex",
  lastName: "Brown",
  age: 24,
  clubId: "c1",
  clubName: "Castlemere United",
  overallRating: { _tag: "exact", value: overallRating },
  transferValue: { _tag: "exact", value: transferValue },
  positions: [{ position: "ST" }],
} satisfies MarketPlayerRow);

const ranged = (low: number, high: number, from: number, to: number) => ({
  id: "p2",
  firstName: "Chris",
  lastName: "Carter",
  age: 26,
  clubId: "c1",
  clubName: "Castlemere United",
  overallRating: { _tag: "range", low, high },
  transferValue: { _tag: "range", low: from, high: to },
  positions: [{ position: "MC" }],
} satisfies MarketPlayerRow);

describe("market row figures (ticket 09)", () => {
  it("marketPlayerRowOf maps the figure union straight through", () => {
    const view = {
      id: "p1",
      firstName: "Alex",
      lastName: "Brown",
      age: 24,
      clubId: "c1",
      clubName: "Castlemere United",
      overallRating: { _tag: "range", low: 58, high: 98 },
      transferValue: { _tag: "range", low: 120000, high: 750000 },
      positions: [{ position: "MC", familiarity: "natural" }],
    };
    const row = marketPlayerRowOf(view as never);
    expect(row.overallRating).toEqual({ _tag: "range", low: 58, high: 98 });
    expect(row.transferValue).toEqual({ _tag: "range", low: 120000, high: 750000 });
  });

  it("an exact figure sorts by its value; a range sorts by its midpoint, never by the bound", () => {
    expect(figureMid({ _tag: "exact", value: 78 })).toBe(78);
    expect(figureMid({ _tag: "range", low: 58, high: 98 })).toBe(78);
    expect(figureMid({ _tag: "range", low: 100, high: 200 })).toBe(150);
  });

  it("an exact figure renders the number; a range renders low–high with the en dash", () => {
    expect(formatFigure({ _tag: "exact", value: 78 })).toBe("78");
    expect(formatFigure({ _tag: "range", low: 58, high: 98 })).toBe("58–98");
  });

  it("a Credits figure renders the same union with the Cr suffix", () => {
    expect(formatCredits(1_200_000)).toMatch(/^1,200,000 Cr$/);
    expect(formatFigureCredits({ _tag: "exact", value: 1_200_000 })).toMatch(/^1,200,000 Cr$/);
    expect(formatFigureCredits({ _tag: "range", low: 500_000, high: 750_000 })).toMatch(
      /^500,000 Cr–750,000 Cr$/,
    );
  });

  it("the OVR column sorts by range midpoint", () => {
    const columns = marketColumns((row) => row.clubName ?? "Free Agent");
    const accessor = accessorOf(columns, "overall");

    // Midpoint 78 beats midpoint 100; a low exact 1 behaves like its 1, not its neighbourhood bound.
    expect(accessor(scouted(1, 0))).toBeLessThan(accessor(ranged(58, 98, 0, 0)));
    expect(accessor(ranged(58, 98, 0, 0))).toBeLessThan(accessor(ranged(90, 110, 0, 0)));
  });

  it("the Value column sorts by range midpoint of the Credits figure", () => {
    const columns = marketColumns((row) => row.clubName ?? "Free Agent");
    const accessor = accessorOf(columns, "value");

    expect(accessor(ranged(0, 0, 100_000, 300_000))).toBe(200_000);
    expect(accessor(ranged(0, 0, 700_000, 900_000))).toBe(800_000);
    expect(accessor(ranged(0, 0, 100_000, 300_000))).toBeLessThan(accessor(ranged(0, 0, 700_000, 900_000)));
  });

  it("the headers the palette advertises match the table headers", () => {
    expect(MARKET_COLUMN_LABELS).toEqual({ name: "Name", age: "Age", overall: "OVR", value: "Value" });
  });
});