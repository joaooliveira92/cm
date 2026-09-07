import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/random.js";
import {
  PRESENCE_ROLES,
  ROLE_DEPARTMENT,
  SCOUT_HEADCOUNT,
  STAFF_ROLES,
  coachModifier,
  deriveClubStaff,
  derivePresenceStaff,
  generateStaff,
  type ClubPersonRole,
} from "../../src/rules/staff.js";
import { STATURE_TIERS, type StatureTier } from "../../src/content/clubs.js";
import { NAME_POOLS } from "../../src/content/namePools.js";
import { NATION_CODES, type NationCode } from "../../src/content/nations.js";
import { deriveSeed } from "../../src/seed.js";
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

describe("presence staff", () => {
  const presencePair = (clubId: string, clubNation: NationCode, worldSeed: number) =>
    derivePresenceStaff({ clubId, clubNation, worldSeed });

  it("is PRESENCE_ROLES exactly [president, physio], beside STAFF_ROLES unchanged at [coach, scout]", () => {
    // Two unions keep the `staff_role` check constraint honest: it still permits exactly coach and
    // scout, and ClubPersonRole is the union a caller reads when it needs the whole backroom.
    expect(PRESENCE_ROLES).toEqual(["president", "physio"]);
    expect(STAFF_ROLES).toEqual(["coach", "scout"]);
    const roles: readonly ClubPersonRole[] = [...STAFF_ROLES, ...PRESENCE_ROLES];
    expect(roles).toEqual(["coach", "scout", "president", "physio"]);
  });

  it("derives exactly one president and one physio, named from the club's own nation", () => {
    for (const clubNation of NATION_CODES) {
      const pair = presencePair("redcastle", clubNation, 5);
      expect(pair.map((person) => person.role)).toEqual(["president", "physio"]);
      const pool = NAME_POOLS[clubNation];
      for (const person of pair) {
        expect(pool.givenNames).toContain(person.firstName);
        expect(pool.surnames).toContain(person.lastName);
      }
    }
  });

  it("is identical across two independent derivations — the pair is fixed for the club's life", () => {
    expect(presencePair("solent", "ENG", 1_586)).toEqual(presencePair("solent", "ENG", 1_586));
    expect(presencePair("solent", "ENG", 1_586)).not.toEqual(presencePair("other", "ENG", 1_586));
  });

  it("derives each person from their own seed, so the physio never shifts the president and neither touches the staff stream", () => {
    const clubId = "castella";
    const worldSeed = 4242;
    const presidentSeed = deriveSeed(worldSeed, "presence", `${clubId}:president`);
    const physioSeed = deriveSeed(worldSeed, "presence", `${clubId}:physio`);
    expect(physioSeed).not.toBe(presidentSeed);

    // The president is exactly who the president's own seed draws — a shared stream would have let
    // deriving the physio first shift it.
    const pool = NAME_POOLS.ENG;
    const draw = (seed: number) => {
      const random = createSeededRng(seed);
      return {
        firstName: pool.givenNames[Math.floor(random.next() * pool.givenNames.length)] as string,
        lastName: pool.surnames[Math.floor(random.next() * pool.surnames.length)] as string,
      };
    };
    expect(derivePresenceStaff({ clubId, clubNation: "ENG", worldSeed })[0]).toEqual({
      role: "president",
      ...draw(presidentSeed),
    });
    expect(presencePair(clubId, "ENG", worldSeed)[1]?.role).toBe("physio");

    // Neither presence person draws from the club's bound `staff` stream.
    expect(deriveSeed(worldSeed, "staff", clubId)).not.toBe(presidentSeed);
    expect(deriveSeed(worldSeed, "staff", clubId)).not.toBe(physioSeed);
  });

  it("derives the same pair for a results-only club as for any club — nothing varies by Stature Tier", () => {
    // The presence derivation deliberately reads no Stature Tier — presence people carry no number
    // for the tier to own — so every tier-variant of the same club falls out identically. A
    // results-only club's inputs are its tier, nation, and seed; the pair answers for it like any
    // other club's.
    const resultsOnly = { clubId: "sentinel", clubNation: "ENG" as const, worldSeed: 4242 };
    const pair = derivePresenceStaff(resultsOnly);
    expect(pair.map((person) => person.role)).toEqual(["president", "physio"]);
    for (const statureTier of STATURE_TIERS) {
      expect(derivePresenceStaff(resultsOnly), `tier ${statureTier}`).toEqual(pair);
    }
  });

  it("never hands a club a president and a physio who share a full name", () => {
    // Collision is ~1 in 480 per drawn pair at today's pool sizes, so over a few thousand pairs a
    // redraw-free implementation would surface roughly an order of magnitude of duplicates; only
    // the presence-internal redraw keeps this green.
    for (const clubNation of NATION_CODES) {
      for (const clubId of ["northwatch", "seatbay", "costarena"]) {
        for (let seed = 1; seed <= 200; seed++) {
          const pair = presencePair(clubId, clubNation, seed);
          const names = pair.map((person) => `${person.firstName} ${person.lastName}`);
          expect(new Set(names).size, `${clubNation} ${clubId} seed ${seed}`).toBe(names.length);
        }
      }
    }
  });
});

describe("a club's whole backroom, grouped by department", () => {
  it("returns the four people in fixed Executive → Coaching → Recruitment → Medical order", () => {
    for (const statureTier of STATURE_TIERS) {
      const groups = deriveClubStaff({ clubId: "redcastle", statureTier, clubNation: "ENG", worldSeed: 11 });
      expect(groups.map((group) => group.department)).toEqual([
        "executive",
        "coaching",
        "recruitment",
        "medical",
      ]);
      expect(ROLE_DEPARTMENT).toEqual({
        president: "executive",
        coach: "coaching",
        scout: "recruitment",
        physio: "medical",
      });

      const executive = groups.find((group) => group.department === "executive");
      expect(executive?.members.map((person) => person.role)).toEqual(["president"]);
      const coaching = groups.find((group) => group.department === "coaching");
      expect(coaching?.members.map((person) => person.role)).toEqual(["coach"]);
      const recruitment = groups.find((group) => group.department === "recruitment");
      expect(recruitment?.members.map((person) => person.role)).toEqual(
        Array.from({ length: SCOUT_HEADCOUNT[statureTier] }, () => "scout" as const),
      );
      const medical = groups.find((group) => group.department === "medical");
      expect(medical?.members.map((person) => person.role)).toEqual(["physio"]);
    }
  });

  it("names everyone from the club's own pool and rows the derived coach and scouts byte for byte with generateStaff", () => {
    const clubId = "redcastle";
    const clubNation = "PRT";
    const worldSeed = 11;
    const groups = deriveClubStaff({ clubId, statureTier: "mid", clubNation, worldSeed });
    const pool = NAME_POOLS[clubNation];
    for (const group of groups) {
      for (const member of group.members) {
        expect(pool.givenNames).toContain(member.firstName);
        expect(pool.surnames).toContain(member.lastName);
      }
    }

    // Re-deriving the bound two from the exact stream that materialises rows keeps the grouped
    // result in agreement with the `staff` table wherever the rows exist.
    const generated = generateStaff({
      statureTier: "mid",
      clubNation,
      random: createSeededRng(deriveSeed(worldSeed, "staff", clubId)),
    });
    const coaching = groups.find((group) => group.department === "coaching");
    expect(coaching?.members).toEqual([
      { role: "coach", firstName: generated[0]?.firstName, lastName: generated[0]?.lastName },
    ]);
    const recruitment = groups.find((group) => group.department === "recruitment");
    expect(recruitment?.members).toEqual(
      generated.slice(1).map(({ role, firstName, lastName }) => ({ role, firstName, lastName })),
    );
  });
});
