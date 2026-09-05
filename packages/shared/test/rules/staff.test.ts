import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/random.js";
import { SCOUT_HEADCOUNT, coachModifier, generateStaff } from "../../src/rules/staff.js";
import { STATURE_TIERS, type StatureTier } from "../../src/content/clubs.js";
import {
  PLAYER_DEVELOPMENT_FRACTION,
  TRAINING_FOCUS_MULTIPLIER,
  developPlayer,
} from "../../src/rules/training.js";
import { technicalCoachingModifier } from "../../src/rules/managerPillars.js";
import type { PlayerAttributes } from "../../src/rules/positions.js";

const LEGAL_QUALITIES = Array.from({ length: 20 }, (_, index) => index + 1);

describe("the coach binding", () => {
  it("never makes a club worse off than having no coach, across the whole domain", () => {
    // The hard invariant, over every legal quality rather than a sampled few. AI clubs develop on
    // the unmodified baseline, so a modifier below 1 would make a manager at a small club develop
    // players more slowly than every AI club in the world — punishing a decision they were never
    // offered, since there is no hiring market.
    for (const quality of LEGAL_QUALITIES) {
      expect(coachModifier(quality), `quality ${quality}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("is worth more at a better club, and worth something at the top", () => {
    expect(coachModifier(20)).toBeGreaterThan(coachModifier(1));
    expect(coachModifier(1)).toBe(1);
  });

  it("leaves Technical Coaching's own invariant untouched", () => {
    // The coach scales the baseline; the Pillar scales the focus multiplier. Each term has exactly
    // one owner, so setting a Focus stays better than setting none at every combination of the two.
    for (const quality of LEGAL_QUALITIES) {
      for (const pillar of [1, 2, 3, 4, 5]) {
        const focused = coachModifier(quality) * TRAINING_FOCUS_MULTIPLIER * technicalCoachingModifier(pillar);
        const unfocused = coachModifier(quality);
        expect(focused, `q${quality} p${pillar}`).toBeGreaterThan(unfocused);
      }
    }
  });

  it("never develops an attribute past its ceiling, however good the coach", () => {
    // A coach multiplier can push the focused fraction above 1, at which point an unclamped step
    // overshoots the ceiling and can leave the 1-20 range entirely.
    const attributes = { passing: 5, shooting: 5, tackling: 5 } as unknown as PlayerAttributes;
    const developed = developPlayer(attributes, 18, 100, "technical", coachModifier(20));
    for (const value of Object.values(developed as Record<string, number>)) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(20);
    }
    expect(PLAYER_DEVELOPMENT_FRACTION * coachModifier(20) * TRAINING_FOCUS_MULTIPLIER).toBeGreaterThan(1);
  });
});

describe("a club's backroom", () => {
  const staffFor = (statureTier: StatureTier, seed: number) =>
    generateStaff({ statureTier, clubNation: "ENG", random: createSeededRng(seed) });

  it("is one coach and the Stature Tier's scout headcount", () => {
    for (const statureTier of STATURE_TIERS) {
      const staff = staffFor(statureTier, 11);
      expect(staff.filter((person) => person.role === "coach")).toHaveLength(1);
      expect(staff.filter((person) => person.role === "scout")).toHaveLength(
        SCOUT_HEADCOUNT[statureTier],
      );
    }
  });

  it("gives a bigger club a bigger backroom", () => {
    expect(SCOUT_HEADCOUNT.big).toBeGreaterThan(SCOUT_HEADCOUNT.mid);
    expect(SCOUT_HEADCOUNT.mid).toBeGreaterThan(SCOUT_HEADCOUNT.small);
  });

  it("keeps every quality inside the legal scale", () => {
    for (const statureTier of STATURE_TIERS) {
      for (let seed = 1; seed <= 40; seed++) {
        for (const person of staffFor(statureTier, seed)) {
          expect(person.quality).toBeGreaterThanOrEqual(1);
          expect(person.quality).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it("is the same backroom for the same stream, whenever it is derived", () => {
    // What makes taking a club at save creation and taking it five seasons after a sacking give the
    // same people: nothing about arrival time or career history enters.
    expect(staffFor("mid", 909)).toEqual(staffFor("mid", 909));
  });

  it("names its people from the club's own nation", () => {
    const portuguese = generateStaff({
      statureTier: "mid",
      clubNation: "PRT",
      random: createSeededRng(5),
    });
    const english = generateStaff({
      statureTier: "mid",
      clubNation: "ENG",
      random: createSeededRng(5),
    });
    expect(portuguese.map((person) => person.lastName)).not.toEqual(
      english.map((person) => person.lastName),
    );
  });
});
