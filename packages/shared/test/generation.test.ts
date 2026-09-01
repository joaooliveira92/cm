import { describe, expect, it } from "vitest";
import { createSeededRng } from "@cm-clone/game-engine";
import { SQUAD_SLOTS, generatePlayer, generateSquad, type RandomSource } from "../src/generation.js";

const context = (seed: number, referenceYear = 2026) => ({
  statureTier: "mid" as const,
  random: createSeededRng(seed),
  referenceYear,
});

describe("generatePlayer determinism", () => {
  it("produces an identical player for an identical seed", () => {
    expect(generatePlayer("ST", context(99))).toEqual(generatePlayer("ST", context(99)));
  });

  it("produces a different player for a different seed", () => {
    expect(generatePlayer("ST", context(1))).not.toEqual(generatePlayer("ST", context(2)));
  });

  it("does not read the wall clock", () => {
    // Age is measured against an explicit reference year, so a world regenerated next January is
    // the same world. Reading `new Date()` here would make every save unreproducible after a
    // year boundary.
    const player = generatePlayer("ST", context(99, 2026));
    const later = generatePlayer("ST", context(99, 2030));
    expect(Number(player.dateOfBirth.slice(0, 4)) + 4).toBe(Number(later.dateOfBirth.slice(0, 4)));
    expect(player.attributes).toEqual(later.attributes);
  });

  it("keeps every attribute on the 1-20 scale", () => {
    for (let seed = 0; seed < 100; seed++) {
      const player = generatePlayer("ST", context(seed));
      for (const value of Object.values(player.attributes)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe("generateSquad", () => {
  const randomForSlot = (worldSeed: number) => (slot: { readonly index: number }): RandomSource =>
    createSeededRng(worldSeed * 1000 + slot.index);

  it("fills every declared squad slot", () => {
    const squad = generateSquad("mid", { referenceYear: 2026, randomForSlot: randomForSlot(7) });
    expect(squad).toHaveLength(SQUAD_SLOTS.length);
    expect(squad.map((player) => player.slot.position)).toEqual(
      SQUAD_SLOTS.map((slot) => slot.position),
    );
  });

  it("is identical for identical slot seeds", () => {
    const a = generateSquad("mid", { referenceYear: 2026, randomForSlot: randomForSlot(7) });
    const b = generateSquad("mid", { referenceYear: 2026, randomForSlot: randomForSlot(7) });
    expect(a).toEqual(b);
  });

  it("confines a re-seeded slot to that slot", () => {
    // The property the whole seed-derivation scheme exists for: a player is a function of their
    // own slot seed alone, never of a stream their neighbours advanced. Without it, inserting one
    // player shifts every player after them.
    const base = generateSquad("mid", { referenceYear: 2026, randomForSlot: randomForSlot(7) });
    const perturbed = generateSquad("mid", {
      referenceYear: 2026,
      randomForSlot: (slot) =>
        slot.index === 3 ? createSeededRng(123456) : randomForSlot(7)(slot),
    });
    expect(perturbed[3]).not.toEqual(base[3]);
    expect(perturbed.filter((_, index) => index !== 3)).toEqual(
      base.filter((_, index) => index !== 3),
    );
  });
});
