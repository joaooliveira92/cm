import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/random.js";
import { generatePlayer, generateSquad } from "../../src/rules/generation.js";
import {
  HIDDEN_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  POSITION_WEIGHTS,
  type PlayerAttributes,
} from "../../src/rules/positions.js";
import type { ClubStrength } from "../../src/rules/clubGeneration.js";

const MID_TABLE: ClubStrength = { tier: 1, nationPrior: 0.5, statureTier: "mid" };

/** Generation takes an explicit seed, so these assertions describe one fixed squad rather than
 *  whatever `Math.random` produced on the day. */
const squadOf = (tier: "big" | "mid" | "small", seed: number) =>
  generateSquad({ tier: 1, nationPrior: 0.5, statureTier: tier }, {
    referenceYear: 2026,
    clubNation: "ENG",
    randomForSlot: (slot) => createSeededRng(seed + slot.index),
  });

const playerAt = (position: Parameters<typeof generatePlayer>[0], seed: number) =>
  generatePlayer(position, { strength: MID_TABLE, clubNation: "ENG", referenceYear: 2026, random: createSeededRng(seed) });

const allAttributes = (players: ReadonlyArray<{ readonly attributes: PlayerAttributes }>): ReadonlyArray<PlayerAttributes> =>
  players.map((p) => p.attributes);

describe("fitness & injury attributes", () => {
  it("generates injuryProneness as a hidden 1-20 attribute on every player", () => {
    const players = allAttributes(squadOf("mid", 1000));
    expect(players.length).toBeGreaterThan(0);
    for (const attributes of players) {
      expect(attributes.injuryProneness).toBeGreaterThanOrEqual(1);
      expect(attributes.injuryProneness).toBeLessThanOrEqual(20);
    }
  });

  it("generates a distinct, non-degenerate injuryProneness spread across a squad", () => {
    const values = allAttributes(squadOf("big", 2000)).map((a) => a.injuryProneness);
    expect(new Set(values).size).toBeGreaterThan(2);
  });

  it("exposes naturalFitness as a visible Physical attribute", () => {
    expect(PHYSICAL_ATTRIBUTES).toContain("naturalFitness");
    const attributes = playerAt("ST", 3000).attributes;
    expect(attributes.naturalFitness).toBeGreaterThanOrEqual(1);
    expect(attributes.naturalFitness).toBeLessThanOrEqual(20);
  });

  it("keeps injuryProneness out of every displayed attribute group", () => {
    expect(PHYSICAL_ATTRIBUTES).not.toContain("injuryProneness");
  });

  it("never weights injuryProneness or naturalFitness into any Position Rating", () => {
    for (const weightTable of Object.values(POSITION_WEIGHTS)) {
      expect(weightTable).not.toHaveProperty("injuryProneness");
      expect(weightTable).not.toHaveProperty("naturalFitness");
    }
  });

  it("defines injuryProneness as the only hidden attribute", () => {
    expect(HIDDEN_ATTRIBUTES).toEqual(["injuryProneness"]);
  });
});