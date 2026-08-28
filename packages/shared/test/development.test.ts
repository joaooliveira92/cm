import { describe, expect, it } from "vitest";
import {
  HIDDEN_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
  type PlayerAttributes,
} from "../src/positions.js";
import {
  PLAYER_DEVELOPMENT_FRACTION,
  TRAINING_FOCUS_MULTIPLIER,
  attributeCeilingOn20Scale,
  developPlayer,
} from "../src/training.js";

const baseAttributes = (over: Partial<PlayerAttributes> = {}): PlayerAttributes => ({
  passing: 8,
  shooting: 8,
  tackling: 8,
  dribbling: 8,
  heading: 8,
  crossing: 8,
  finishing: 8,
  firstTouch: 8,
  positioning: 8,
  decisions: 8,
  composure: 8,
  determination: 8,
  teamwork: 8,
  flair: 8,
  bravery: 8,
  aggression: 8,
  pace: 8,
  acceleration: 8,
  stamina: 8,
  strength: 8,
  agility: 8,
  naturalFitness: 8,
  injuryProneness: 5,
  ...over,
});

describe("Player Development math", () => {
  it("is fully deterministic — identical inputs produce identical output", () => {
    const attrs = baseAttributes();
    expect(developPlayer(attrs, 18, 80)).toEqual(developPlayer(attrs, 18, 80));
  });

  it("moves each Attribute a fixed fraction of the gap toward its age ceiling through youth", () => {
    const result = developPlayer(baseAttributes(), 18, 80);
    const ceiling = attributeCeilingOn20Scale("passing", 18, 80);
    expect(result.passing).toBe(Math.round(8 + (ceiling - 8) * PLAYER_DEVELOPMENT_FRACTION));
  });

  it("never overshoots the ceiling (self-clamping) and holds a maxed Attribute at the ceiling", () => {
    // An Attribute already at the ceiling stays put.
    expect(developPlayer(baseAttributes({ passing: 20 }), 25, 100).passing).toBe(20);
    // A value below the ceiling closes the gap but never passes it.
    const result = developPlayer(baseAttributes({ passing: 4 }), 18, 50);
    const ceiling = attributeCeilingOn20Scale("passing", 18, 50);
    expect(result.passing).toBeLessThanOrEqual(Math.ceil(ceiling));
  });

  it("plateaus through the prime — a prime-age Attribute at its ceiling holds", () => {
    // Age 25, Potential 80 -> ceiling 16; a Technical Attribute already at 16 holds.
    expect(developPlayer(baseAttributes({ passing: 16 }), 25, 80).passing).toBe(16);
  });

  it("declines Physical Attributes past 30 while Technical/Mental hold", () => {
    // Age 34, Potential 80: Physical ceiling has dropped (~1.5/season past 30); Technical holds at 16.
    const result = developPlayer(baseAttributes({ pace: 16, passing: 16 }), 34, 80);
    expect(result.pace).toBeLessThan(16);
    expect(result.passing).toBe(16);
  });

  it("develops hidden Attributes by the same fraction-of-gap rule", () => {
    const result = developPlayer(baseAttributes(), 18, 80);
    const ceiling = attributeCeilingOn20Scale("injuryProneness", 18, 80);
    expect(result.injuryProneness).toBe(Math.round(5 + (ceiling - 5) * PLAYER_DEVELOPMENT_FRACTION));
    expect(result.injuryProneness).toBeGreaterThan(5);
  });
});

describe("Training Focus bias", () => {
  it("multiplies only the focused Category's step, leaving the other three unchanged", () => {
    const attrs = baseAttributes();
    const noFocus = developPlayer(attrs, 18, 80);
    const technicalFocus = developPlayer(attrs, 18, 80, "technical");

    // Focused Category's growth step is multiplied by TRAINING_FOCUS_MULTIPLIER.
    const ceiling = attributeCeilingOn20Scale("passing", 18, 80);
    expect(technicalFocus.passing).toBe(
      Math.round(8 + (ceiling - 8) * PLAYER_DEVELOPMENT_FRACTION * TRAINING_FOCUS_MULTIPLIER),
    );

    // Every Technical Attribute grew strictly more than unmodified.
    for (const attribute of TECHNICAL_ATTRIBUTES) {
      expect(technicalFocus[attribute]).toBeGreaterThan(noFocus[attribute]);
    }

    // The other three Categories (and hidden) are bit-identical to a no-focus season.
    for (const attribute of [...MENTAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES]) {
      expect(technicalFocus[attribute]).toBe(noFocus[attribute]);
    }
  });

  it("a Goalkeeping focus affects only Goalkeeping Attributes", () => {
    const attrs = baseAttributes({ gkHandling: 8, gkReflexes: 8 });
    const noFocus = developPlayer(attrs, 18, 80);
    const gkFocus = developPlayer(attrs, 18, 80, "goalkeeping");
    expect(gkFocus.gkHandling).toBeGreaterThan(noFocus.gkHandling!);
    expect(gkFocus.gkReflexes).toBeGreaterThan(noFocus.gkReflexes!);
    expect(gkFocus.passing).toBe(noFocus.passing);
  });
});

describe("named tuning constants", () => {
  it("exposes PLAYER_DEVELOPMENT_FRACTION and TRAINING_FOCUS_MULTIPLIER as named exports", () => {
    expect(PLAYER_DEVELOPMENT_FRACTION).toBeGreaterThan(0);
    expect(PLAYER_DEVELOPMENT_FRACTION).toBeLessThan(1);
    expect(TRAINING_FOCUS_MULTIPLIER).toBeGreaterThan(1);
  });
});