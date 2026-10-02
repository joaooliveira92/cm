import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES, type TacticTemplate } from "@cm-clone/shared";
import { cellAt, dropZoneAt, pitchLayout, spotOf } from "../../../src/renderer/tactics/pitchLayout.js";

describe("pitchLayout — where each Tactic slot sits on the pitch diagram", () => {
  const toPositions = (template: TacticTemplate) =>
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

  it("lays each slot at its cell's centre on the pitch", () => {
    const positions = toPositions(BUILT_IN_TEMPLATES.find((t) => t.name === "4-4-2")!);
    const spots = pitchLayout(positions);
    const [gk, dR, dL, dRC, dLC] = [0, 1, 2, 3, 4].map((slot) => spots[slot]!);
    expect(gk!.x).toBe(50);
    expect(gk!.y).toBe(89);
    expect(dR!.x).toBe(89);
    expect(dR!.y).toBe(73);
    expect(dL!.x).toBe(11);
    expect(dL!.y).toBe(73);
    expect(dRC!.x).toBe(70);
    expect(dRC!.y).toBe(73);
    expect(dLC!.x).toBe(30);
    expect(dLC!.y).toBe(73);
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
    expect(cellAt(50, 87)).toBeNull();
  });

  it("reads the band just in front of the back line as DM, not D", () => {
    expect(cellAt(50, 63)).toMatchObject({ row: "DM", column: "C" });
  });

  it("has a sweeper only in the centre: deep on any other column is still D", () => {
    expect(cellAt(50, 80)).toMatchObject({ row: "SW", column: "C" });
    expect(cellAt(10, 80)).toMatchObject({ row: "D", column: "L" });
    expect(cellAt(30, 80)).toMatchObject({ row: "D", column: "LC" });
    expect(cellAt(70, 80)).toMatchObject({ row: "D", column: "RC" });
    expect(cellAt(90, 80)).toMatchObject({ row: "D", column: "R" });
  });
});

describe("dropZoneAt — the nearest cell and the point as a sub-position within it", () => {
  it("finds the nearest cell for a point on the outfield", () => {
    expect(dropZoneAt(10, 74)).toMatchObject({ cell: { row: "D", column: "L" } });
    expect(dropZoneAt(50, 58)).toMatchObject({ cell: { row: "DM", column: "C" } });
  });

  it("returns null in the keeper's end", () => {
    expect(dropZoneAt(50, 87)).toBeNull();
  });
});
describe("sub-positions — 0-1 fractions within the cell, as the Tactic stores them", () => {
  it("reads a cell's centre as 0.5 on both axes", () => {
    expect(dropZoneAt(50, 41)).toEqual({ cell: { row: "M", column: "C" }, subRow: 0.5, subCol: 0.5 });
    expect(dropZoneAt(11, 13)).toEqual({ cell: { row: "F", column: "L" }, subRow: 0.5, subCol: 0.5 });
  });

  it("keeps every sub-position inside 0-1, which the server's validation requires", () => {
    for (let x = -5; x <= 105; x += 2.5) {
      for (let y = -5; y <= 83; y += 2.5) {
        const zone = dropZoneAt(x, y)!;
        expect(zone.subRow).toBeGreaterThanOrEqual(0);
        expect(zone.subRow).toBeLessThanOrEqual(1);
        expect(zone.subCol).toBeGreaterThanOrEqual(0);
        expect(zone.subCol).toBeLessThanOrEqual(1);
      }
    }
  });

  it("draws a drop back where it was released, anywhere on the outfield", () => {
    for (let x = 4; x <= 96; x += 3.7) {
      for (let y = 3; y <= 83; y += 3.1) {
        const zone = dropZoneAt(x, y)!;
        const spot = spotOf(zone.cell, zone.subRow, zone.subCol);
        expect(spot.x).toBeCloseTo(x, 1);
        expect(spot.y).toBeCloseTo(y, 1);
      }
    }
  });

  it("meets the neighbouring cell at its edge, so no offset reaches into another cell", () => {
    expect(spotOf({ row: "M", column: "L" }, 0.5, 1).x).toBe(spotOf({ row: "M", column: "LC" }, 0.5, 0).x);
    expect(spotOf({ row: "AM", column: "C" }, 1, 0.5).y).toBe(spotOf({ row: "M", column: "C" }, 0, 0.5).y);
  });
});
