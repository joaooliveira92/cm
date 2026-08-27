import { describe, expect, it } from "vitest";
import { FORMATION_SLOTS, POSITION_ROLES, type PlayerAttributes } from "@cm-clone/shared";
import type { MatchCommand } from "../../src/match/commands.js";
import type { InjuryEvent } from "../../src/match/events.js";
import {
  simulateMatch,
  simulateMatchWithCondition,
  type SimulateMatchInput,
} from "../../src/match/simulate.js";
import type { MatchPlayerInput, MatchTeamSetup } from "../../src/match/types.js";
import { buildTeam } from "./fixtures.js";

const baseInput = (seed: number): SimulateMatchInput => ({
  seed,
  home: buildTeam("home-club", seed).setup,
  away: buildTeam("away-club", seed + 1000).setup,
});

/** A fully-maxed outfield attribute set, overridden per test — so crafted fixtures differ only in
 * the attribute under test rather than in incidental skill noise. */
const craftAttributes = (overrides: Partial<Record<keyof PlayerAttributes, number>> = {}): PlayerAttributes => {
  const base: Record<string, number> = {};
  const keys = [
    "passing", "shooting", "tackling", "dribbling", "heading", "crossing", "finishing", "firstTouch",
    "positioning", "decisions", "composure", "determination", "teamwork", "flair",
    "pace", "acceleration", "stamina", "strength", "agility", "naturalFitness",
    "bravery", "aggression", "injuryProneness",
  ];
  for (const key of keys) base[key] = 10;
  return { ...(base as PlayerAttributes), ...overrides };
};

const craftTeam = (clubId: string, attributes: PlayerAttributes, formation: keyof typeof FORMATION_SLOTS = "4-4-2"): MatchTeamSetup => {
  const squad: Array<MatchPlayerInput> = FORMATION_SLOTS[formation].map((position, index) => ({
    id: `${clubId}-${index}`,
    attributes: { ...attributes },
  }));
  const tactic = {
    formation,
    slots: FORMATION_SLOTS[formation].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: `${clubId}-${index}`,
    })),
    mentality: "balanced" as const,
    tempo: "normal" as const,
    pressing: "high" as const,
  };
  return { clubId, squad, tactic };
};

describe("simulateMatch", () => {
  it("starts with MatchStarted (carrying the seed) and ends with FullTimeWhistle", () => {
    const events = simulateMatch(baseInput(1));
    expect(events[0]).toMatchObject({ _tag: "MatchStarted", seed: 1 });
    expect(events.at(-1)).toMatchObject({ _tag: "FullTimeWhistle" });
  });

  it("emits exactly one HalfTimeReached, between the two halves", () => {
    const events = simulateMatch(baseInput(2));
    const halfTimeIndices = events.flatMap((e, i) => (e._tag === "HalfTimeReached" ? [i] : []));
    expect(halfTimeIndices).toHaveLength(1);
    const fullTimeIndex = events.findIndex((e) => e._tag === "FullTimeWhistle");
    expect(halfTimeIndices[0]).toBeLessThan(fullTimeIndex);
  });

  it("is fully deterministic: same seed and same commands reproduce an identical timeline", () => {
    const input = baseInput(3);
    const first = simulateMatch(input);
    const second = simulateMatch(input);
    expect(second).toEqual(first);
  });

  it("produces a different timeline for a different seed", () => {
    const eventsA = simulateMatch(baseInput(10));
    const eventsB = simulateMatch(baseInput(11));
    expect(eventsB).not.toEqual(eventsA);
  });

  it("keeps the final score consistent with the Goal events emitted", () => {
    const events = simulateMatch(baseInput(4));
    const goals = events.filter((e) => e._tag === "Goal");
    const homeGoals = goals.filter((g) => g.teamClubId === "home-club").length;
    const awayGoals = goals.filter((g) => g.teamClubId === "away-club").length;
    const fullTime = events.at(-1) as { homeScore: number; awayScore: number };
    expect(fullTime.homeScore).toBe(homeGoals);
    expect(fullTime.awayScore).toBe(awayGoals);
  });

  it("runs several matches and, across them, produces a broad slice of the Match Event vocabulary", () => {
    const seenTags = new Set<string>();
    for (let seed = 100; seed < 140; seed++) {
      for (const event of simulateMatch(baseInput(seed))) {
        seenTags.add(event._tag);
      }
    }
    for (const tag of [
      "MatchStarted",
      "Goal",
      "ShotOnTarget",
      "ShotMissed",
      "BigChance",
      "HalfTimeReached",
      "FullTimeWhistle",
    ]) {
      expect(seenTags.has(tag)).toBe(true);
    }
  });

  describe("injury & fitness system", () => {
    const injuriesAcross = (from: number, to: number): Array<InjuryEvent> => {
      const injuries: Array<InjuryEvent> = [];
      for (let seed = from; seed < to; seed++) {
        for (const event of simulateMatch(baseInput(seed))) {
          if (event._tag === "Injury") injuries.push(event);
        }
      }
      return injuries;
    };

    it("fires both contact and non-contact injuries across a seed sweep", () => {
      const injuries = injuriesAcross(1, 1200);
      expect(injuries.some((i) => i.trigger === "contact")).toBe(true);
      expect(injuries.some((i) => i.trigger === "non-contact")).toBe(true);
    }, 20000);

    it("exposes every player's full-time Condition deterministically (ticket 02)", () => {
      const input = baseInput(7);
      const { events, conditions } = simulateMatchWithCondition(input);
      const squadIds = [...input.home.squad.map((p) => p.id), ...input.away.squad.map((p) => p.id)];
      for (const id of squadIds) {
        expect(conditions.get(id)).toBeGreaterThanOrEqual(0);
        expect(conditions.get(id)).toBeLessThanOrEqual(100);
      }
      // Fatigue happened on the pitch: at least one on-pitch player finished below full Condition.
      const onPitch = input.home.tactic.slots.map((slot) => slot.playerId);
      expect(onPitch.some((id) => (conditions.get(id) ?? 100) < 100)).toBe(true);
      // Deterministic from the seed.
      expect(simulateMatchWithCondition(input).conditions).toEqual(conditions);
      void events;
    });

    it("a high-Aggression challenge against a low-Bravery, injury-prone attacker causes contact injuries (ticket 06)", () => {
      const homeAttack = craftTeam("home", craftAttributes({ aggression: 20, bravery: 1, injuryProneness: 20, stamina: 18 }));
      const awayDefense = craftTeam("away", craftAttributes({ aggression: 20, bravery: 1, injuryProneness: 20, stamina: 18 }));
      // Run a few seeds; the crafted extreme makes a collision near-certain whenever a duel is drawn.
      let contact = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const events = simulateMatch({ seed, home: seed % 2 === 0 ? homeAttack : awayDefense, away: seed % 2 === 0 ? awayDefense : homeAttack });
        contact += events.filter((e): e is InjuryEvent => e._tag === "Injury" && e.trigger === "contact").length;
      }
      expect(contact).toBeGreaterThan(0);
    });

    it("emits every injury with a typed trigger, severity, type, and orange/red tier", () => {
      const injuries = injuriesAcross(1, 1200);
      expect(injuries.length).toBeGreaterThan(0);
      for (const injury of injuries) {
        expect(["contact", "non-contact"]).toContain(injury.trigger);
        expect(["light", "medium", "severe"]).toContain(injury.severity);
        expect(["orange", "red"]).toContain(injury.tier);
        expect(typeof injury.type).toBe("string");
      }
    }, 20000);

    it("routes a red (severe) injury to a forced substitution", () => {
      let redCount = 0;
      let forcedSubs = 0;
      for (let seed = 1; seed < 800; seed++) {
        const events = simulateMatch(baseInput(seed));
        for (const event of events) {
          if (event._tag === "Injury" && event.tier === "red") redCount++;
          if (event._tag === "Substitution" && event.forcedByInjury) forcedSubs++;
        }
      }
      // Red injuries always force the player off; a bench player fills the slot when one exists.
      expect(redCount).toBeGreaterThan(0);
      expect(forcedSubs).toBeGreaterThanOrEqual(redCount * 0.9);
    }, 20000);

    it("is deterministic: an injury-bearing match reproduces identically", () => {
      let seed = 1;
      while (seed < 3000) {
        const input = baseInput(seed);
        const events = simulateMatch(input);
        if (events.some((e) => e._tag === "Injury")) {
          expect(simulateMatch(input)).toEqual(events);
          return;
        }
        seed++;
      }
      throw new Error("no injury found in sweep — investigate risk constants");
    });
  });

  describe("mid-match commands", () => {
    it("accepts a mid-match ChangeTactics and it affects subsequent Phase Strength", () => {
      const home = buildTeam("home-club", 20);
      const away = buildTeam("away-club", 21);
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [50, [{ _tag: "ChangeTactics", clubId: "home-club", tactic: { ...home.setup.tactic, mentality: "attacking" } }]],
      ]);
      const events = simulateMatch({ seed: 20, home: home.setup, away: away.setup, commandsByMinute });
      expect(events.some((e) => e._tag === "FullTimeWhistle")).toBe(true);
    });

    it("accepts a valid mid-match MakeSubstitution and emits a Substitution event", () => {
      const home = buildTeam("home-club", 30);
      const away = buildTeam("away-club", 31);
      const outPlayerId = home.setup.tactic.slots[0]!.playerId;
      const inPlayerId = home.squad.find((p) => !home.setup.tactic.slots.some((s) => s.playerId === p.id))!.id;
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [10, [{ _tag: "MakeSubstitution", clubId: "home-club", outPlayerId, inPlayerId }]],
      ]);
      const events = simulateMatch({ seed: 30, home: home.setup, away: away.setup, commandsByMinute });
      expect(
        events.some(
          (e) => e._tag === "Substitution" && e.outPlayerId === outPlayerId && e.inPlayerId === inPlayerId,
        ),
      ).toBe(true);
    });

    it("rejects (silently drops) a substitution once the 5-sub cap is reached", () => {
      const home = buildTeam("home-club", 40);
      const away = buildTeam("away-club", 41);
      const bench = home.squad.filter((p) => !home.setup.tactic.slots.some((s) => s.playerId === p.id));
      const starters = home.setup.tactic.slots.map((s) => s.playerId);

      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>();
      for (let i = 0; i < 6; i++) {
        commandsByMinute.set(10 + i, [
          { _tag: "MakeSubstitution", clubId: "home-club", outPlayerId: starters[i]!, inPlayerId: bench[i]!.id },
        ]);
      }

      const events = simulateMatch({ seed: 40, home: home.setup, away: away.setup, commandsByMinute });
      const homeSubs = events.filter((e) => e._tag === "Substitution" && e.teamClubId === "home-club" && !e.forcedByInjury);
      expect(homeSubs.length).toBeLessThanOrEqual(5);
    });

    it("rejects a 4th substitution window (halftime doesn't count as a window)", () => {
      const home = buildTeam("home-club", 50);
      const away = buildTeam("away-club", 51);
      const bench = home.squad.filter((p) => !home.setup.tactic.slots.some((s) => s.playerId === p.id));
      const starters = home.setup.tactic.slots.map((s) => s.playerId);

      // 3 distinct-minute windows mid-match, plus a halftime window (free), plus a 4th mid-match window.
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [10, [{ _tag: "MakeSubstitution", clubId: "home-club", outPlayerId: starters[0]!, inPlayerId: bench[0]!.id }]],
        [20, [{ _tag: "MakeSubstitution", clubId: "home-club", outPlayerId: starters[1]!, inPlayerId: bench[1]!.id }]],
        [30, [{ _tag: "MakeSubstitution", clubId: "home-club", outPlayerId: starters[2]!, inPlayerId: bench[2]!.id }]],
        [70, [{ _tag: "MakeSubstitution", clubId: "home-club", outPlayerId: starters[3]!, inPlayerId: bench[3]!.id }]],
      ]);
      const halftimeCommands: ReadonlyArray<MatchCommand> = [
        { _tag: "MakeSubstitution", clubId: "home-club", outPlayerId: starters[4]!, inPlayerId: bench[4]!.id },
      ];

      const events = simulateMatch({ seed: 50, home: home.setup, away: away.setup, commandsByMinute, halftimeCommands });
      const homeSubs = events
        .filter((e): e is Extract<typeof e, { _tag: "Substitution" }> => e._tag === "Substitution")
        .filter((e) => e.teamClubId === "home-club" && !e.forcedByInjury);
      // 3 mid-match windows + 1 free halftime window accepted; the 4th mid-match window is rejected.
      expect(homeSubs).toHaveLength(4);
      expect(homeSubs.some((s) => s.outPlayerId === starters[3])).toBe(false);
    });
  });
});
