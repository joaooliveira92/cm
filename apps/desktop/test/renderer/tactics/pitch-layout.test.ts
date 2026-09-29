import { describe, expect, it } from "vitest";
import { FORMATIONS, FORMATION_SLOTS } from "@cm-clone/shared";
import { dropZoneAt, pitchLayout, positionAt } from "../../../src/renderer/tactics/pitchLayout.js";

describe("pitchLayout — where each Tactic slot sits on the pitch diagram", () => {
  it("places every slot of every formation once, inside the pitch, in slot order", () => {
    for (const formation of FORMATIONS) {
      const spots = pitchLayout(FORMATION_SLOTS[formation]);
      expect(spots.map((spot) => spot.slotIndex)).toEqual([...FORMATION_SLOTS[formation].keys()]);
      for (const { x, y } of spots) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(100);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(100);
      }
      // No two markers share a spot.
      expect(new Set(spots.map(({ x, y }) => `${x},${y}`)).size).toBe(spots.length);
    }
  });

  it("lays a line out left flank, centre, right flank, whatever the slot order", () => {
    // 4-4-2's back four is stored DC, DC, DL, DR.
    const spots = pitchLayout(FORMATION_SLOTS["4-4-2"]);
    const [dcA, dcB, dl, dr] = [1, 2, 3, 4].map((slot) => spots[slot]!);
    expect(dl!.x).toBeLessThan(dcA!.x);
    expect(dcA!.x).toBeLessThan(dcB!.x);
    expect(dcB!.x).toBeLessThan(dr!.x);
    expect(new Set([dcA, dcB, dl, dr].map((spot) => spot!.y)).size).toBe(1);
  });

  it("puts the keeper deepest and the strikers highest", () => {
    const spots = pitchLayout(FORMATION_SLOTS["4-4-2"]);
    const ys = spots.map((spot) => spot.y);
    expect(spots[0]!.y).toBe(Math.max(...ys));
    expect(spots[9]!.y).toBe(Math.min(...ys));
    expect(spots[0]!.x).toBe(50);
  });
});

describe("positionAt — the Position a drop point on the pitch stands for", () => {
  it("reads the nearest line, then the flank third across it", () => {
    expect(positionAt(50, 10)).toBe("ST");
    expect(positionAt(90, 28)).toBe("AMC");
    expect(positionAt(10, 42)).toBe("ML");
    expect(positionAt(50, 42)).toBe("MC");
    expect(positionAt(90, 42)).toBe("MR");
    expect(positionAt(10, 58)).toBe("DM");
    expect(positionAt(10, 74)).toBe("DL");
    expect(positionAt(50, 74)).toBe("DC");
    expect(positionAt(90, 74)).toBe("DR");
  });

  it("takes no outfield slot in the keeper's end", () => {
    expect(positionAt(50, 85)).toBeNull();
  });
});

describe("dropZoneAt — the patch of grass a Position's drop covers", () => {
  it("cuts a flanked line into thirds and spans a centre-only line across the pitch", () => {
    expect(dropZoneAt(10, 74)).toMatchObject({ position: "DL", left: 0 });
    expect(dropZoneAt(50, 58)).toMatchObject({ position: "DM", left: 0, right: 100 });
  });

  it("tiles the outfield: each zone ends where the next line's begins", () => {
    const bands = [10, 28, 42, 58, 74].map((y) => dropZoneAt(50, y)!);
    for (const [index, band] of bands.slice(1).entries()) {
      expect(band.top).toBe(bands[index]!.bottom);
    }
    expect(bands[0]!.top).toBe(0);
  });
});
