import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/random.js";
import {
  SQUAD_FLOOR,
  SQUAD_SLOTS,
  generatePlayer,
  generateSquad,
  generateYouthIntake,
} from "../../src/rules/generation.js";
import { deriveSeed } from "../../src/seed.js";
import type { RandomSource } from "../../src/random.js";
import type { ClubStrength } from "../../src/rules/clubGeneration.js";

const MID_TABLE: ClubStrength = { tier: 1, nationPrior: 0.5, statureTier: "mid" };

const context = (seed: number, referenceYear = 2026) => ({
  strength: MID_TABLE,
  clubNation: "ENG" as const,
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
    const squad = generateSquad(MID_TABLE, { clubNation: "ENG", referenceYear: 2026, randomForSlot: randomForSlot(7) });
    expect(squad).toHaveLength(SQUAD_SLOTS.length);
    expect(squad.map((player) => player.slot.position)).toEqual(
      SQUAD_SLOTS.map((slot) => slot.position),
    );
  });

  it("is identical for identical slot seeds", () => {
    const a = generateSquad(MID_TABLE, { clubNation: "ENG", referenceYear: 2026, randomForSlot: randomForSlot(7) });
    const b = generateSquad(MID_TABLE, { clubNation: "ENG", referenceYear: 2026, randomForSlot: randomForSlot(7) });
    expect(a).toEqual(b);
  });

  it("confines a re-seeded slot to that slot", () => {
    // The property the whole seed-derivation scheme exists for: a player is a function of their
    // own slot seed alone, never of a stream their neighbours advanced. Without it, inserting one
    // player shifts every player after them.
    const base = generateSquad(MID_TABLE, { clubNation: "ENG", referenceYear: 2026, randomForSlot: randomForSlot(7) });
    const perturbed = generateSquad(MID_TABLE, {
      referenceYear: 2026,
      clubNation: "ENG",
      randomForSlot: (slot) =>
        slot.index === 3 ? createSeededRng(123456) : randomForSlot(7)(slot),
    });
    expect(perturbed[3]).not.toEqual(base[3]);
    expect(perturbed.filter((_, index) => index !== 3)).toEqual(
      base.filter((_, index) => index !== 3),
    );
  });
});

describe("generateYouthIntake", () => {
  const intake = (seed: number, squadSize: number, taken: ReadonlySet<string> = new Set()) =>
    generateYouthIntake(MID_TABLE, {
      year: 2027,
      clubNation: "ENG",
      squadSize,
      taken,
      sizeRandom: createSeededRng(deriveSeed(seed, "size")),
      randomForSlot: (index) => createSeededRng(deriveSeed(seed, "player", index)),
    });

  it("brings two to four players to a squad already at the floor", () => {
    const sizes = new Set<number>();
    for (let seed = 0; seed < 200; seed++) sizes.add(intake(seed, 25).length);
    expect([...sizes].sort()).toEqual([2, 3, 4]);
  });

  it("brings as many as it takes to reach the floor when that is more", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(intake(seed, 5).length).toBe(SQUAD_FLOOR - 5);
      expect(intake(seed, 0).length).toBe(SQUAD_FLOOR);
      // Just under the floor: the ordinary draw may already cover it.
      expect(intake(seed, 14).length).toBeGreaterThanOrEqual(2);
      expect(14 + intake(seed, 14).length).toBeGreaterThanOrEqual(SQUAD_FLOOR);
    }
  });

  it("draws players born 17 or 18 years before the year they join in", () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const player of intake(seed, 0)) {
        const born = Number(player.dateOfBirth.slice(0, 4));
        expect([2027 - 18, 2027 - 17]).toContain(born);
      }
    }
  });

  it("is identical for identical seeds and different for different ones", () => {
    expect(intake(7, 10)).toEqual(intake(7, 10));
    expect(intake(7, 10)).not.toEqual(intake(8, 10));
  });

  it("numbers its slots from zero and avoids names the squad already uses", () => {
    const first = intake(3, 0);
    expect(first.map((player) => player.slot.index)).toEqual(first.map((_, index) => index));
    const taken = new Set(first.map((player) => `${player.firstName} ${player.lastName}`));
    const again = intake(3, 0, taken);
    const clashes = again.filter((player) => taken.has(`${player.firstName} ${player.lastName}`));
    expect(clashes).toEqual([]);
  });
});

describe("generatePlayer ages", () => {
  it("draws a senior squad at 17-34 when no range is given, as it always has", () => {
    for (let seed = 0; seed < 200; seed++) {
      const born = Number(generatePlayer("MC", context(seed)).dateOfBirth.slice(0, 4));
      expect(2026 - born).toBeGreaterThanOrEqual(17);
      expect(2026 - born).toBeLessThanOrEqual(34);
    }
  });
});
