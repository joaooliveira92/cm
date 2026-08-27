import { describe, expect, it } from "vitest";
import { positionRating, overallRating } from "../src/ratings.js";
import { generatePlayer, generateSquad } from "../src/generation.js";
import type { PlayerAttributes } from "../src/positions.js";

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

describe("generation", () => {
  it("never generates goalkeeping attributes for an outfield player", () => {
    const player = generatePlayer("ST", "mid");
    expect(player.attributes.gkHandling).toBeUndefined();
  });

  it("generates goalkeeping attributes for a GK", () => {
    const player = generatePlayer("GK", "mid");
    expect(player.attributes.gkHandling).toBeGreaterThanOrEqual(1);
  });

  it("fills every Position with enough depth for a matchday squad", () => {
    const squad = generateSquad("mid");
    const positionsCovered = new Set(squad.flatMap((p) => p.positions.map((pp) => pp.position)));
    for (const position of ["GK", "DC", "DL", "DR", "DM", "MC", "ML", "MR", "AMC", "ST"] as const) {
      expect(positionsCovered.has(position)).toBe(true);
    }
  });
});
