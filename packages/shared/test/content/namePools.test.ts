import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/random.js";
import { NAME_POOLS, nationsWithEmptyPools, poolCombinations } from "../../src/content/namePools.js";
import { NATION_CODES, migrationLink } from "../../src/content/nations.js";
import { drawNationality, generateSquad } from "../../src/rules/generation.js";
import type { ClubStrength } from "../../src/rules/clubGeneration.js";

const TOP_FLIGHT: ClubStrength = { tier: 1, nationPrior: 0.5, statureTier: "mid" };

const squadFor = (clubNation: (typeof NATION_CODES)[number], seed: number) =>
  generateSquad(TOP_FLIGHT, {
    referenceYear: 2026,
    clubNation,
    randomForSlot: (slot) => createSeededRng(seed * 1000 + slot.index),
  });

describe("the shipped name pools", () => {
  it("carries a pool for every nation the code knows about", () => {
    // A nation with an empty pool is a defect in the shipped data, caught here rather than as a
    // runtime failure part-way through generating a world.
    expect(nationsWithEmptyPools()).toEqual([]);
  });

  it("keeps every pool distinct enough that two leagues do not read alike", () => {
    // The whole point of nation-keyed pools: a Portuguese squad must not read like an English one.
    const overlap = (a: (typeof NATION_CODES)[number], b: (typeof NATION_CODES)[number]) => {
      const other = new Set(NAME_POOLS[b].surnames);
      return NAME_POOLS[a].surnames.filter((surname) => other.has(surname)).length;
    };
    expect(overlap("ENG", "ESP")).toBeLessThan(3);
    expect(overlap("DEU", "BRA")).toBeLessThan(3);
    // Portuguese and Brazilian surnames genuinely overlap — shared language, and the migration
    // link between them is the strongest in the data. That is real, not a bug.
    expect(overlap("PRT", "BRA")).toBeGreaterThan(3);
  });

  it("is far short of the size the decision calls for, and says so", () => {
    // The target is ~20,000 combinations a nation, so a full name recurs about twice at ~40,000
    // players. What ships is the structure and a head start; this pins the gap so it stays visible
    // rather than being mistaken for the finished pool.
    for (const code of NATION_CODES) {
      expect(poolCombinations(code)).toBeGreaterThan(300);
      expect(poolCombinations(code)).toBeLessThan(20_000);
    }
  });
});

describe("a squad reads like its nation", () => {
  it("never repeats a full name inside one squad", () => {
    // No `UNIQUE` constraint enforces this — names are attributes, not identifiers — so avoiding a
    // duplicate within a squad is generation's job, done by redrawing.
    for (let seed = 1; seed <= 20; seed++) {
      const squad = squadFor("ENG", seed);
      const names = squad.map((player) => `${player.firstName} ${player.lastName}`);
      expect(new Set(names).size, `seed ${seed}`).toBe(names.length);
    }
  });

  it("keeps full-name recurrence across a league within a stated band", () => {
    // Twenty squads of 25 — a division's worth of players — against pools of a few hundred
    // combinations. Every name recurring would mean four hundred people wearing four hundred
    // thousand shirts; no name ever recurring would mean the pool is unrealistically large.
    const league = Array.from({ length: 20 }, (_, club) => squadFor("ENG", club + 1)).flat();
    const names = league.map((player) => `${player.firstName} ${player.lastName}`);
    const distinct = new Set(names).size;
    const recurrence = names.length / distinct;

    expect(names.length).toBe(500);
    expect(recurrence).toBeGreaterThan(1);
    expect(recurrence).toBeLessThan(1.6);
  });

  it("draws most players from the club's nation and some from its recruitment links", () => {
    // `MIGRATION_LINKS` shifts a distribution; it never sets a value. England recruits from four
    // nations at weights summing to about a third, so a domestic majority with a visible foreign
    // minority is what the data describes.
    const league = Array.from({ length: 20 }, (_, club) => squadFor("ENG", club + 1)).flat();
    const domestic = league.filter((player) => player.nationality === "ENG").length;
    const share = domestic / league.length;

    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.9);
    expect(new Set(league.map((player) => player.nationality)).size).toBeGreaterThan(1);
  });

  it("gives a nation with no recruitment links a fully domestic squad", () => {
    // Andorra and Italy are absent from `MIGRATION_LINKS`. That is a gap in the data, visible as a
    // gap, rather than a statement about those countries.
    expect(migrationLink("AND", "ESP")).toBe(0);
    for (let seed = 1; seed <= 5; seed++) {
      expect(squadFor("AND", seed).every((player) => player.nationality === "AND")).toBe(true);
    }
  });

  it("draws nationality before anything else, from the club's nation outward", () => {
    const domestic = Array.from({ length: 200 }, (_, seed) =>
      drawNationality("ENG", createSeededRng(seed)),
    );
    expect(domestic.filter((code) => code === "ENG").length).toBeGreaterThan(120);
    expect(new Set(domestic)).toContain("FRA");
  });

  it("gives every player a birthplace in their own nation", () => {
    for (const player of squadFor("ENG", 3)) {
      expect(player.birthCity).not.toBeNull();
      expect(player.birthCity?.nationCode).toBe(player.nationality);
    }
  });
});
