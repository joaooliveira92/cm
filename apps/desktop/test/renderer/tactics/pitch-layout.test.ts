import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES } from "@cm-clone/shared";
import { cellAt, dropZoneAt, pitchLayout } from "../../../src/renderer/tactics/pitchLayout.js";

describe("pitchLayout — where each Tactic slot sits on the pitch diagram", () => {
  const toPositions = (template: { readonly slots: ReadonlyArray<{ readonly cell: any; readonly subRow: number; readonly subCol: number }> }) =>
    template.slots.map((s) => ({ cell: s.cell, subRow: s.subRow, subCol: s.subCol }));

  it("places every slot of every built-in template once, inside the pitch, in slot order", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const positions = toPositions(template);
      const spots = pitchLayout(positions);
      expect(spots.map((spot) => spot.slotIndex)).toEqual([...positions.keys()]);
      for (const { x, y } of spots) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(100);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(100);
      }
      expect(new Set(spots.map(({ x, y }) => `${x},${y}`)).size).toBe(spots.length);
    }
  });

  it("lays a line out left flank, centre, right flank, whatever the slot order", () => {
    const positions = toPositions(BUILT_IN_TEMPLATES.find((t) => t.name === "4-4-2")!);
    const spots = pitchLayout(positions);
    const [dcA, dcB, dl, dr] = [1, 2, 3, 4].map((slot) => spots[slot]!);
    expect(dl!.x).toBeLessThan(dcA!.x);
    expect(dcA!.x).toBeLessThan(dcB!.x);
    expect(dcB!.x).toBeLessThan(dr!.x);
    expect(new Set([dcA, dcB, dl, dr].map((spot) => spot!.y)).size).toBe(1);
  });

  it("puts the keeper deepest and the strikers highest", () => {
    const positions = toPositions(BUILT_IN_TEMPLATES.find((t) => t.name === "4-4-2")!);
    const spots = pitchLayout(positions);
    const ys = spots.map((spot) => spot.y);
    expect(spots[0]!.y).toBe(Math.max(...ys));
    expect(spots[9]!.y).toBe(Math.min(...ys));
    expect(spots[0]!.x).toBe(50);
  });
});

describe("cellAt — the cell a drop point on the pitch stands for", () => {
  it("reads the nearest row, then the nearest column across it", () => {
    expect(cellAt(50, 10)).toMatchObject({ row: "F", column: "C" });
    expect(cellAt(90, 28)).toMatchObject({ row: "AM", column: "R" });
    expect(cellAt(10, 42)).toMatchObject({ row: "M", column: "L" });
    expect(cellAt(50, 42)).toMatchObject({ row: "M", column: "C" });
    expect(cellAt(90, 42)).toMatchObject({ row: "M", column: "R" });
    expect(cellAt(10, 58)).toMatchObject({ row: "DM", column: "L" });
    expect(cellAt(10, 74)).toMatchObject({ row: "D", column: "L" });
    expect(cellAt(50, 74)).toMatchObject({ row: "D", column: "C" });
    expect(cellAt(90, 74)).toMatchObject({ row: "D", column: "R" });
  });

  it("takes no outfield cell in the keeper's end", () => {
    expect(cellAt(50, 85)).toBeNull();
  });
});

describe("dropZoneAt — the patch of grass a cell's drop covers", () => {
  it("cuts a flanked line into thirds and spans a centre-only line across the pitch", () => {
    expect(dropZoneAt(10, 74)).toMatchObject({ cell: { row: "D", column: "L" }, left: 0 });
    expect(dropZoneAt(50, 58)).toMatchObject({ cell: { row: "DM", column: "C" }, left: 0, right: 100 });
  });

  it("tiles the outfield: each zone ends where the next line's begins", () => {
    const bands = [10, 28, 42, 58, 74].map((y) => dropZoneAt(50, y)!);
    for (const [index, band] of bands.slice(1).entries()) {
      expect(band.top).toBe(bands[index]!.bottom);
    }
    expect(bands[0]!.top).toBe(0);
  });
});