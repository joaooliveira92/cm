import { describe, expect, it } from "vitest";
import { FORMATIONS, FORMATION_SLOTS } from "@cm-clone/shared";
import { pitchLayout } from "../../../src/renderer/tactics/pitchLayout.js";

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
