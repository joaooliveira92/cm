import { describe, expect, it } from "vitest";
import type { StatureTier } from "../src/clubs.js";
import {
  RESULTS_STRENGTH_CALIBRATION,
  collapseSquadStrength,
  resolveByStrength,
  resultsStrength,
} from "../src/resultsStrength.js";

const STATURE_TIERS: ReadonlyArray<StatureTier> = ["big", "mid", "small"];

/** A pyramid's worth of clubs at one Stature Tier: four tiers, a spread of nation priors. */
const sample = (statureTier: StatureTier, seasonNumber: number): ReadonlyArray<number> => {
  const values: Array<number> = [];
  for (let tier = 1; tier <= 4; tier += 1) {
    for (let slot = 0; slot < 400; slot += 1) {
      values.push(
        resultsStrength({
          worldSeed: 12345,
          clubId: `club_x_${tier}_${slot}`,
          statureTier,
          tier,
          nationPrior: 0.4 + (slot % 5) * 0.1,
          seasonNumber,
        }),
      );
    }
  }
  return values.sort((a, b) => a - b);
};

const percentile = (sorted: ReadonlyArray<number>, p: number): number =>
  sorted[Math.floor((sorted.length - 1) * p)]!;

describe("Results Strength reproduces the measured squad calibration", () => {
  for (const statureTier of STATURE_TIERS) {
    it(`matches the ${statureTier} band`, () => {
      const band = RESULTS_STRENGTH_CALIBRATION[statureTier];
      const values = sample(statureTier, 1);
      const mean = values.reduce((total, value) => total + value, 0) / values.length;

      expect(Math.abs(mean - band.mean)).toBeLessThan(1);
      // The seeded values are integers and the measured bands are not, so a percentile is allowed
      // to land within a rating point of its target.
      expect(Math.abs(percentile(values, 0.1) - band.p10)).toBeLessThanOrEqual(1);
      expect(Math.abs(percentile(values, 0.9) - band.p90)).toBeLessThanOrEqual(1);
      expect(values[0]!).toBeGreaterThanOrEqual(Math.floor(band.min));
      expect(values.at(-1)!).toBeLessThanOrEqual(Math.ceil(band.max));
    });
  }

  it("keeps the bands stable across seasons rather than widening after the first", () => {
    // The per-season walk is seeded at its stationary spread, so season 8 is drawn from the same
    // distribution as season 1. A walk starting at zero would make every club average until its
    // fortunes had had a few years to spread out.
    const first = sample("mid", 1);
    const eighth = sample("mid", 8);
    const meanOf = (values: ReadonlyArray<number>) =>
      values.reduce((total, value) => total + value, 0) / values.length;

    expect(Math.abs(meanOf(first) - meanOf(eighth))).toBeLessThan(1);
    expect(Math.abs(percentile(first, 0.9) - percentile(eighth, 0.9))).toBeLessThanOrEqual(1);
  });

  it("overlaps the tiers, so a strong small club outranks a weak mid one", () => {
    const small = sample("small", 1);
    const mid = sample("mid", 1);
    expect(percentile(small, 0.9)).toBeGreaterThan(percentile(mid, 0.1));
  });
});

describe("a results-only league has a story", () => {
  it("does not hand the same club the best strength every season", () => {
    // The point of the per-season walk. A background nation whose biggest club wins every season
    // forever is a table, not a football nation.
    const clubs = Array.from({ length: 20 }, (_, slot) => ({
      clubId: `club_deu_1_${String(slot + 1).padStart(2, "0")}`,
      statureTier: (slot < 4 ? "big" : slot < 12 ? "mid" : "small") as StatureTier,
    }));

    const strongest = new Set<string>();
    for (let seasonNumber = 1; seasonNumber <= 10; seasonNumber += 1) {
      const ranked = clubs
        .map((club) => ({
          clubId: club.clubId,
          strength: resultsStrength({
            worldSeed: 4242,
            clubId: club.clubId,
            statureTier: club.statureTier,
            tier: 1,
            nationPrior: 0.8,
            seasonNumber,
          }),
        }))
        .sort((a, b) => b.strength - a.strength);
      strongest.add(ranked[0]!.clubId);
    }

    expect(strongest.size).toBeGreaterThan(1);
  });

  it("is reproducible: the same world seed gives the same club the same number", () => {
    const inputs = {
      worldSeed: 777,
      clubId: "club_deu_2_07",
      statureTier: "mid" as StatureTier,
      tier: 2,
      nationPrior: 0.8,
      seasonNumber: 3,
    };
    expect(resultsStrength(inputs)).toBe(resultsStrength(inputs));
    expect(resultsStrength(inputs)).not.toBe(resultsStrength({ ...inputs, worldSeed: 778 }));
  });
});

describe("resolveByStrength", () => {
  it("is deterministic in its seed", () => {
    expect(resolveByStrength(50, 40, 999)).toEqual(resolveByStrength(50, 40, 999));
  });

  it("favours the stronger club over a season's worth of fixtures", () => {
    let strongWins = 0;
    let weakWins = 0;
    for (let fixture = 0; fixture < 200; fixture += 1) {
      const { homeGoals, awayGoals } = resolveByStrength(55, 35, fixture);
      if (homeGoals > awayGoals) strongWins += 1;
      if (awayGoals > homeGoals) weakWins += 1;
    }
    expect(strongWins).toBeGreaterThan(weakWins * 2);
    // Never certain, though: an upset has to remain possible or a results-only league is a ranking
    // rather than a competition.
    expect(weakWins).toBeGreaterThan(0);
  });

  it("produces scorelines the rest of the game can render", () => {
    for (let fixture = 0; fixture < 500; fixture += 1) {
      const { homeGoals, awayGoals } = resolveByStrength(45, 45, fixture);
      expect(homeGoals).toBeGreaterThanOrEqual(0);
      expect(homeGoals).toBeLessThanOrEqual(9);
      expect(awayGoals).toBeLessThanOrEqual(9);
    }
  });
});

describe("collapseSquadStrength", () => {
  it("lands a squad on the same 1-100 scale a results-only club is drawn on", () => {
    expect(collapseSquadStrength(52.4)).toBe(52);
    expect(collapseSquadStrength(0)).toBe(1);
    expect(collapseSquadStrength(140)).toBe(100);
  });
});
