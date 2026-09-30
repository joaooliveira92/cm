import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/random.js";
import type { ClubStrength } from "../../src/rules/clubGeneration.js";
import { generateSquad, type GeneratedSquadPlayer } from "../../src/rules/generation.js";
import { compactPositionLabel } from "../../src/rules/positionLabel.js";
import { ARCHETYPES, drawPositionalRatings, primarySlotOf } from "../../src/rules/positionalGeneration.js";
import { COMPETENT_SUITABILITY, NATURAL_SUITABILITY, suitability } from "../../src/rules/suitability.js";
import { POSITION_SLOT } from "../../src/rules/slots.js";
import { FORMATIONS, FORMATION_SLOTS } from "../../src/rules/tactics.js";

const MID_TABLE: ClubStrength = { tier: 1, nationPrior: 0.5, statureTier: "mid" };

const squadFor = (seed: number): ReadonlyArray<GeneratedSquadPlayer> =>
  generateSquad(MID_TABLE, {
    referenceYear: 2026,
    clubNation: "ENG",
    randomForSlot: (slot) => createSeededRng(seed * 100 + slot.index),
  });

/** Whether distinct players can fill every slot at competent or better (bipartite matching). */
const canFill = (squad: ReadonlyArray<GeneratedSquadPlayer>, cells: ReadonlyArray<typeof POSITION_SLOT.GK>): boolean => {
  const fits = cells.map((cell) =>
    squad.flatMap((player, index) =>
      suitability(player.positionalRatings, cell) >= COMPETENT_SUITABILITY ? [index] : [],
    ),
  );
  const owner = new Map<number, number>();
  const assign = (slotIndex: number, seen: Set<number>): boolean => {
    for (const player of fits[slotIndex] ?? []) {
      if (seen.has(player)) continue;
      seen.add(player);
      const current = owner.get(player);
      if (current === undefined || assign(current, seen)) {
        owner.set(player, slotIndex);
        return true;
      }
    }
    return false;
  };
  return cells.every((_, slotIndex) => assign(slotIndex, new Set()));
};

describe("drawPositionalRatings", () => {
  it("is deterministic for a seed", () => {
    for (const archetype of ARCHETYPES) {
      expect(drawPositionalRatings(archetype, 12, createSeededRng(5))).toEqual(
        drawPositionalRatings(archetype, 12, createSeededRng(5)),
      );
    }
  });

  it("makes every archetype natural in its own cell", () => {
    for (const archetype of ARCHETYPES) {
      for (let seed = 0; seed < 50; seed += 1) {
        const ratings = drawPositionalRatings(archetype, 10, createSeededRng(seed));
        expect(suitability(ratings, primarySlotOf(archetype))).toBeGreaterThanOrEqual(NATURAL_SUITABILITY);
      }
    }
  });

  it("keeps every rating on 1-20", () => {
    for (const archetype of ARCHETYPES) {
      for (let seed = 0; seed < 50; seed += 1) {
        const { lines, sides, freeRole } = drawPositionalRatings(archetype, 20, createSeededRng(seed));
        for (const value of [...Object.values(lines), ...Object.values(sides), freeRole]) {
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it("gives roaming archetypes a Free Role Rating that follows flair, and defenders none worth the name", () => {
    const sample = (archetype: (typeof ARCHETYPES)[number], flair: number): ReadonlyArray<number> =>
      Array.from({ length: 200 }, (_, seed) => drawPositionalRatings(archetype, flair, createSeededRng(seed)).freeRole);
    const mean = (values: ReadonlyArray<number>): number => values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean(sample("attackingMid", 18))).toBeGreaterThan(mean(sample("attackingMid", 6)) + 5);
    expect(sample("attackingMid", 18).some((value) => value >= 15)).toBe(true);
    expect(Math.max(...sample("centreBack", 20))).toBeLessThan(COMPETENT_SUITABILITY);
  });

  it("puts a full-back on his own flank, and rarely on both", () => {
    const labels = Array.from({ length: 300 }, (_, seed) =>
      compactPositionLabel(drawPositionalRatings("rightBack", 10, createSeededRng(seed))),
    );
    const sidesOf = (label: string): string => label.split(" ")[1] ?? "";
    expect(labels.every((label) => sidesOf(label).includes("R"))).toBe(true);
    const bothFlanks = labels.filter((label) => sidesOf(label).includes("L")).length;
    expect(bothFlanks / labels.length).toBeGreaterThan(0.05);
    expect(bothFlanks / labels.length).toBeLessThan(0.3);
  });
});

describe("generated squads", () => {
  it("can each field the 4-4-2, 4-3-3, 3-5-2 and 5-3-2 shapes with competent players", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const squad = squadFor(seed);
      for (const formation of FORMATIONS) {
        const cells = FORMATION_SLOTS[formation].map((position) => POSITION_SLOT[position]);
        expect(canFill(squad, cells), `seed ${seed}, ${formation}`).toBe(true);
      }
    }
  });

  it("has 25 players, three of them goalkeepers", () => {
    const squad = squadFor(3);
    expect(squad).toHaveLength(25);
    expect(squad.filter((player) => compactPositionLabel(player.positionalRatings) === "GK")).toHaveLength(3);
  });
});
