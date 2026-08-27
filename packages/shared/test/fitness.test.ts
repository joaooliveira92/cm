import { describe, expect, it } from "vitest";
import { generatePlayer, generateSquad } from "../src/generation.js";
import {
  HIDDEN_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  POSITION_WEIGHTS,
  type PlayerAttributes,
} from "../src/positions.js";

const allAttributes = (players: ReadonlyArray<{ readonly attributes: PlayerAttributes }>): ReadonlyArray<PlayerAttributes> =>
  players.map((p) => p.attributes);

describe("fitness & injury attributes", () => {
  it("generates injuryProneness as a hidden 1-20 attribute on every player", () => {
    const players = allAttributes(generateSquad("mid"));
    expect(players.length).toBeGreaterThan(0);
    for (const attributes of players) {
      expect(attributes.injuryProneness).toBeGreaterThanOrEqual(1);
      expect(attributes.injuryProneness).toBeLessThanOrEqual(20);
    }
  });

  it("generates a distinct, non-degenerate injuryProneness spread across a squad", () => {
    const values = allAttributes(generateSquad("big")).map((a) => a.injuryProneness);
    expect(new Set(values).size).toBeGreaterThan(2);
  });

  it("exposes naturalFitness as a visible Physical attribute", () => {
    expect(PHYSICAL_ATTRIBUTES).toContain("naturalFitness");
    const attributes = generatePlayer("ST", "mid").attributes;
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