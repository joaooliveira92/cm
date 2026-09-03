import { describe, expect, it } from "vitest";
import { positionRating, overallRating } from "../src/ratings.js";
import { createSeededRng } from "@cm-clone/game-engine";
import { generatePlayer, generateSquad } from "../src/generation.js";
import type { PlayerAttributes } from "../src/positions.js";
import type { ClubStrength } from "../src/clubGeneration.js";

const MID_TABLE: ClubStrength = { tier: 1, nationPrior: 0.5, statureTier: "mid" };

const maxedOutfieldAttributes: PlayerAttributes = {
  passing: 20,
  shooting: 20,
  tackling: 20,
  dribbling: 20,
  heading: 20,
  crossing: 20,
  finishing: 20,
  firstTouch: 20,
  positioning: 20,
  decisions: 20,
  composure: 20,
  determination: 20,
  teamwork: 20,
  flair: 20,
  pace: 20,
  acceleration: 20,
  stamina: 20,
  strength: 20,
  agility: 20,
  naturalFitness: 20,
  bravery: 20,
  aggression: 20,
  injuryProneness: 10,
};

describe("positionRating", () => {
  it("returns 100 when every weighted attribute is maxed", () => {
    expect(positionRating(maxedOutfieldAttributes, "ST")).toBe(100);
  });

  it("is dragged down by missing goalkeeping Attributes (defaulted to 1) for an outfield player's GK rating", () => {
    expect(positionRating(maxedOutfieldAttributes, "GK")).toBeLessThan(
      positionRating(maxedOutfieldAttributes, "ST"),
    );
  });
});

describe("overallRating", () => {
  it("picks the best Natural-tier Position over a higher-rated Unfamiliar one", () => {
    const rating = overallRating(maxedOutfieldAttributes, [
      { position: "ST", familiarity: "natural" },
      { position: "DC", familiarity: "unfamiliar" },
    ]);
    expect(rating).toBe(positionRating(maxedOutfieldAttributes, "ST"));
  });
});

const playerAt = (position: Parameters<typeof generatePlayer>[0], seed: number) =>
  generatePlayer(position, { strength: MID_TABLE, referenceYear: 2026, random: createSeededRng(seed) });

describe("generation", () => {
  it("never generates goalkeeping attributes for an outfield player", () => {
    const player = playerAt("ST", 4000);
    expect(player.attributes.gkHandling).toBeUndefined();
  });

  it("generates goalkeeping attributes for a GK", () => {
    const player = playerAt("GK", 5000);
    expect(player.attributes.gkHandling).toBeGreaterThanOrEqual(1);
  });

  it("fills every Position with enough depth for a matchday squad", () => {
    const squad = generateSquad(MID_TABLE, {
      referenceYear: 2026,
      randomForSlot: (slot) => createSeededRng(6000 + slot.index),
    });
    const positionsCovered = new Set(squad.flatMap((p) => p.positions.map((pp) => pp.position)));
    for (const position of ["GK", "DC", "DL", "DR", "DM", "MC", "ML", "MR", "AMC", "ST"] as const) {
      expect(positionsCovered.has(position)).toBe(true);
    }
  });
});
