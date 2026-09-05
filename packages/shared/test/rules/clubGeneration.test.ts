import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/random.js";
import {
  drawHometown,
  drawStadiumCapacity,
  drawStadiumName,
  potentialAbilityRange,
  statureTiersFor,
  type ClubStrength,
} from "../../src/rules/clubGeneration.js";

const strength = (over: Partial<ClubStrength> = {}): ClubStrength => ({
  tier: 1,
  nationPrior: 0.5,
  statureTier: "mid",
  ...over,
});

const ceilingOf = (over: Partial<ClubStrength>) => potentialAbilityRange(strength(over))[1];

describe("club strength", () => {
  it("falls with the competition's tier", () => {
    // The whole reason the model changed: a `big` club in a fourth division must not be generated
    // as though it were a `big` club in a first.
    const byTier = [1, 2, 3, 4].map((tier) => ceilingOf({ tier }));
    expect(byTier).toEqual([...byTier].sort((a, b) => b - a));
    expect(byTier[0]).toBeGreaterThan(byTier[3]!);
  });

  it("spreads within a competition by Stature Tier", () => {
    expect(ceilingOf({ statureTier: "big" })).toBeGreaterThan(ceilingOf({ statureTier: "mid" }));
    expect(ceilingOf({ statureTier: "mid" })).toBeGreaterThan(ceilingOf({ statureTier: "small" }));
  });

  it("lets the nation's prior shift the distribution without dominating it", () => {
    // `nations.ts` states the rule this asserts: a prior shifts a distribution and never sets a
    // value, and variation within a club must exceed the gap between two nations. If the national
    // term ever grew past the range width, the generator would be producing caricatures.
    const weak = potentialAbilityRange(strength({ nationPrior: 0 }));
    const strong = potentialAbilityRange(strength({ nationPrior: 1 }));
    const nationalGap = strong[1] - weak[1];
    const withinClub = strong[1] - strong[0];

    expect(nationalGap).toBeGreaterThan(0);
    expect(nationalGap).toBeLessThan(withinClub);
  });

  it("treats a competition off the ladder as neither a first nor a last division", () => {
    const offLadder = ceilingOf({ tier: null });
    expect(offLadder).toBeLessThan(ceilingOf({ tier: 1 }));
    expect(offLadder).toBeGreaterThan(ceilingOf({ tier: 4 }));
  });
});

describe("Stature Tier across a competition", () => {
  const clubsOf = (count: number, seedAt: (index: number) => number) =>
    Array.from({ length: count }, (_, index) => ({
      clubId: `club_eng_1_${String(index + 1).padStart(2, "0")}`,
      seed: seedAt(index),
    }));

  it("fills a fixed spread rather than rolling each club independently", () => {
    const tiers = statureTiersFor(clubsOf(20, (index) => index * 1000));
    const counts = [...tiers.values()].reduce<Record<string, number>>(
      (totals, tier) => ({ ...totals, [tier]: (totals[tier] ?? 0) + 1 }),
      {},
    );
    // Twenty clubs always yield four strong sides and eight strugglers. Independent per-club draws
    // would sometimes produce a division with no `big` club at all.
    expect(counts).toEqual({ big: 4, mid: 8, small: 8 });
  });

  it("fills by seed, never by ordinal", () => {
    // If the ordinal decided, `club_eng_1_01` would always be `big` — which would make the number
    // in a canonical id a ranking, the one thing it must never be.
    const ascending = statureTiersFor(clubsOf(20, (index) => index * 1000));
    const descending = statureTiersFor(clubsOf(20, (index) => (20 - index) * 1000));
    expect(ascending.get("club_eng_1_01")).not.toBe(descending.get("club_eng_1_01"));
  });

  it("is a function of the club set alone, so a wider save cannot move a club's standing", () => {
    const clubs = clubsOf(20, (index) => (index * 7919) % 4096);
    expect(statureTiersFor(clubs)).toEqual(statureTiersFor([...clubs].reverse()));
  });
});

describe("a club's place in the world", () => {
  it("draws a hometown from its own nation", () => {
    for (let seed = 0; seed < 25; seed++) {
      expect(drawHometown("ENG", createSeededRng(seed)).nationCode).toBe("ENG");
    }
  });

  it("allows two clubs to share a city", () => {
    // Independent draws, collisions allowed. The alternative — dealing from a shuffled pool —
    // would make a club's home town depend on how many clubs its nation loaded.
    const drawn = Array.from({ length: 30 }, (_, seed) => drawHometown("ENG", createSeededRng(seed)).name);
    expect(new Set(drawn).size).toBeLessThan(drawn.length);
  });

  it("names a ground without naming a real one", () => {
    const name = drawStadiumName(createSeededRng(4));
    expect(name.split(" ")).toHaveLength(2);
    // The city is deliberately absent: a real city plus a real ground word is how you accidentally
    // name a real stadium, which is the licensing problem the content pack exists to avoid.
    expect(name).not.toContain("London");
  });

  it("sizes a ground by tier and stature, never below a floor", () => {
    const big = drawStadiumCapacity(strength({ statureTier: "big" }), createSeededRng(1));
    const small = drawStadiumCapacity(strength({ statureTier: "small" }), createSeededRng(1));
    const fourthTier = drawStadiumCapacity(strength({ tier: 4 }), createSeededRng(1));

    expect(big).toBeGreaterThan(small);
    expect(ceilingOf({ tier: 1 })).toBeGreaterThan(ceilingOf({ tier: 4 }));
    expect(fourthTier).toBeGreaterThanOrEqual(2000);
  });
});
