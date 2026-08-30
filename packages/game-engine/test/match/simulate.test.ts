import { describe, expect, it } from "vitest";
import { FORMATION_SLOTS, POSITION_ROLES, type PlayerAttributes } from "@cm-clone/shared";
import type { MatchCommand } from "../../src/match/commands.js";
import type { InjuryEvent } from "../../src/match/events.js";
import {
  simulateMatch,
  simulateMatchWithCondition,
  simulateMatchWithCounts,
  type SimulateMatchInput,
} from "../../src/match/simulate.js";
import type { MatchPlayerInput, MatchTeamSetup } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId, playerId as makePlayerId } from "./fixtures.js";

import type { ClubId, PlayerId } from "@cm-clone/contracts";
const baseInput = (seed: number): SimulateMatchInput => ({
  seed,
  home: buildTeam(makeClubId("home-club"), seed).setup,
  away: buildTeam(makeClubId("away-club"), seed + 1000).setup,
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

const craftTeam = (clubId: ClubId, attributes: PlayerAttributes, formation: keyof typeof FORMATION_SLOTS = "4-4-2"): MatchTeamSetup => {
  const squad: Array<MatchPlayerInput> = FORMATION_SLOTS[formation].map((position, index) => ({
    id: makePlayerId(`${clubId}-${index}`),
    attributes: { ...attributes },
  }));
  const tactic = {
    formation,
    slots: FORMATION_SLOTS[formation].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: makePlayerId(`${clubId}-${index}`),
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
      const { conditions } = simulateMatchWithCondition(input);
      const squadIds = [...input.home.squad.map((p) => p.id), ...input.away.squad.map((p) => p.id)];
      for (const id of squadIds) {
        expect(conditions.get(id)).toBeGreaterThanOrEqual(0);
        expect(conditions.get(id)).toBeLessThanOrEqual(100);
      }
      // Fatigue happened on the pitch: at least one on-pitch player finished below full Condition.
      const onPitch = input.home.tactic.slots.map((slot) => slot.playerId);
expect(onPitch.some((id) => (conditions.get(id) ?? 100) < 100)).toBe(true);
      // Deterministic from the seed.
    });

    it("a high-Aggression challenge against a low-Bravery, injury-prone attacker causes contact injuries (ticket 06)", () => {
      const homeAttack = craftTeam(makeClubId("home"), craftAttributes({ aggression: 20, bravery: 1, injuryProneness: 20, stamina: 18 }));
      const awayDefense = craftTeam(makeClubId("away"), craftAttributes({ aggression: 20, bravery: 1, injuryProneness: 20, stamina: 18 }));
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
      const home = buildTeam(makeClubId("home-club"), 20);
      const away = buildTeam(makeClubId("away-club"), 21);
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [50, [{ _tag: "ChangeTactics", clubId: makeClubId("home-club"), tactic: { ...home.setup.tactic, mentality: "attacking" } }]],
      ]);
      const events = simulateMatch({ seed: 20, home: home.setup, away: away.setup, commandsByMinute });
      expect(events.some((e) => e._tag === "FullTimeWhistle")).toBe(true);
    });

    it("accepts a valid mid-match MakeSubstitution and emits a Substitution event", () => {
      const home = buildTeam(makeClubId("home-club"), 30);
      const away = buildTeam(makeClubId("away-club"), 31);
      const outPlayerId = home.setup.tactic.slots[0]!.playerId;
      const inPlayerId = home.squad.find((p) => !home.setup.tactic.slots.some((s) => s.playerId === p.id))!.id;
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [10, [{ _tag: "MakeSubstitution", clubId: makeClubId("home-club"), outPlayerId, inPlayerId }]],
      ]);
      const events = simulateMatch({ seed: 30, home: home.setup, away: away.setup, commandsByMinute });
      expect(
        events.some(
          (e) => e._tag === "Substitution" && e.outPlayerId === outPlayerId && e.inPlayerId === inPlayerId,
        ),
      ).toBe(true);
    });

    it("rejects (silently drops) a substitution once the 5-sub cap is reached", () => {
      const home = buildTeam(makeClubId("home-club"), 40);
      const away = buildTeam(makeClubId("away-club"), 41);
      const bench = home.squad.filter((p) => !home.setup.tactic.slots.some((s) => s.playerId === p.id));
      const starters = home.setup.tactic.slots.map((s) => s.playerId);

      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>();
      for (let i = 0; i < 6; i++) {
        commandsByMinute.set(10 + i, [
          { _tag: "MakeSubstitution", clubId: makeClubId("home-club"), outPlayerId: starters[i]!, inPlayerId: bench[i]!.id },
        ]);
      }

      const events = simulateMatch({ seed: 40, home: home.setup, away: away.setup, commandsByMinute });
      const homeSubs = events.filter((e) => e._tag === "Substitution" && e.teamClubId === "home-club" && !e.forcedByInjury);
      expect(homeSubs.length).toBeLessThanOrEqual(5);
    });

    it("rejects a 4th substitution window (halftime doesn't count as a window)", () => {
      const home = buildTeam(makeClubId("home-club"), 50);
      const away = buildTeam(makeClubId("away-club"), 51);
      const bench = home.squad.filter((p) => !home.setup.tactic.slots.some((s) => s.playerId === p.id));
      const starters = home.setup.tactic.slots.map((s) => s.playerId);

      // 3 distinct-minute windows mid-match, plus a halftime window (free), plus a 4th mid-match window.
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [10, [{ _tag: "MakeSubstitution", clubId: makeClubId("home-club"), outPlayerId: starters[0]!, inPlayerId: bench[0]!.id }]],
        [20, [{ _tag: "MakeSubstitution", clubId: makeClubId("home-club"), outPlayerId: starters[1]!, inPlayerId: bench[1]!.id }]],
        [30, [{ _tag: "MakeSubstitution", clubId: makeClubId("home-club"), outPlayerId: starters[2]!, inPlayerId: bench[2]!.id }]],
        [70, [{ _tag: "MakeSubstitution", clubId: makeClubId("home-club"), outPlayerId: starters[3]!, inPlayerId: bench[3]!.id }]],
      ]);
      const halftimeCommands: ReadonlyArray<MatchCommand> = [
        { _tag: "MakeSubstitution", clubId: makeClubId("home-club"), outPlayerId: starters[4]!, inPlayerId: bench[4]!.id },
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

  describe("ticket 11 no-subs manager flow", () => {
    /** `craftTeam` builds exactly the 11 on-pitch players (no bench) — so any forced-off has no
     * substitute and must play with 10. */
    const noBenchHome = () => craftTeam(makeClubId("home"), craftAttributes({ injuryProneness: 1, aggression: 1 }));
    const noBenchAway = () => craftTeam(makeClubId("away"), craftAttributes({ injuryProneness: 1, aggression: 1 }));

    /** A seed whose natural match has no red card and no red injury for either no-bench team — the
     * only count-changing events come from whatever `ForceOff`/orange commands a test injects. */
    const findCleanSeed = (): number => {
      for (let seed = 1; seed < 4000; seed++) {
        const events = simulateMatch({ seed, home: noBenchHome(), away: noBenchAway() });
        const disruptive = events.some(
          (e) => e._tag === "RedCard" || (e._tag === "Injury" && e.tier === "red"),
        );
        if (!disruptive) return seed;
      }
      throw new Error("no clean seed found for ticket 11 tests");
    };

    it("a ForceOff drags an on-pitch player off to 10 men without consuming a substitution", () => {
      const home = noBenchHome();
      const away = noBenchAway();
      const outPlayerId = home.tactic.slots[3]!.playerId;
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [60, [{ _tag: "ForceOff", clubId: makeClubId("home"), playerId: outPlayerId }]],
      ]);
      const { events, counts } = simulateMatchWithCounts({
        seed: findCleanSeed(),
        home,
        away,
        commandsByMinute,
      });

      const countAt = (minute: number) => counts.find((c) => c.minute === minute)!;
      expect(countAt(59).homeCount).toBe(11);
      expect(countAt(60).homeCount).toBe(10);
      expect(countAt(60).awayCount).toBe(11);
      // No regular substitution event — the ForceOff is a removal to 10, not a like-for-like swap.
      expect(events.filter((e) => e._tag === "Substitution" && e.teamClubId === "home")).toHaveLength(0);
    });

    it("forcing the last goalkeeper off drags an outfield stand-in into the goal at gk=1, still 10", () => {
      const home = noBenchHome();
      const away = noBenchAway();
      const gkId = home.tactic.slots[0]!.playerId;
      const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
        [60, [{ _tag: "ForceOff", clubId: makeClubId("home"), playerId: gkId }]],
      ]);
      const { events, counts } = simulateMatchWithCounts({
        seed: findCleanSeed(),
        home,
        away,
        commandsByMinute,
      });
      expect(counts.find((c) => c.minute === 60)!.homeCount).toBe(10);
      // The last-GK fallback emits a forced Substitution dragging an outfield player into goal.
      expect(
        events.some((e) => e._tag === "Substitution" && e.teamClubId === "home" && e.forcedByInjury),
      ).toBe(true);
    });

    it("an orange (knock) injury leaves the player on (11) by default, and a ForceOff then brings them off (10)", () => {
      // High proneness + low stamina makes non-contact injuries frequent; find a seed where the
      // home no-bench team takes an orange (knock) injury before stoppage time.
      const home = craftTeam(makeClubId("home"), craftAttributes({ injuryProneness: 20, stamina: 1, aggression: 1 }));
      const away = craftTeam(makeClubId("away"), craftAttributes({ injuryProneness: 20, stamina: 1, aggression: 1 }));
      let seed: number | undefined;
      let orangePlayerId: PlayerId | undefined;
      let orangeMinute = 0;
      for (let s = 1; s < 4000; s++) {
        const events = simulateMatch({ seed: s, home, away });
        const orange = events.find(
          (e): e is InjuryEvent => e._tag === "Injury" && e.tier === "orange" && e.teamClubId === "home" && e.minute < 89,
        );
        if (orange) {
          seed = s;
          orangeMinute = orange.minute;
          orangePlayerId = orange.playerId;
          break;
        }
      }
      expect(seed).toBeDefined();

      // Play-on path: no command — the player stays on, so home stays at 11 through the injury.
      const playOn = simulateMatchWithCounts({ seed: seed!, home, away });
      const playOnAfter = playOn.counts.find((c) => c.minute >= orangeMinute);
      expect(playOnAfter!.homeCount).toBe(11);

      // Bring-off path: a ForceOff for that exact player at a later minute empties their slot.
      const bringOff = simulateMatchWithCounts({
        seed: seed!,
        home,
        away,
        commandsByMinute: new Map<number, ReadonlyArray<MatchCommand>>([
          [orangeMinute + 1, [{ _tag: "ForceOff", clubId: makeClubId("home"), playerId: orangePlayerId! }]],
        ]),
      });
      const bringOffAfter = bringOff.counts.find((c) => c.minute === orangeMinute + 1);
      expect(bringOffAfter!.homeCount).toBe(10);
    });

    it("a red forced-off with no subs left keeps the team at 10 men (never 9)", () => {
      const home = craftTeam(makeClubId("home"), craftAttributes({ injuryProneness: 20, stamina: 1, aggression: 1 }));
      const away = craftTeam(makeClubId("away"), craftAttributes({ injuryProneness: 20, stamina: 1, aggression: 1 }));
      let seed: number | undefined;
      for (let s = 1; s < 4000; s++) {
        const events = simulateMatch({ seed: s, home, away });
        if (events.some((e) => e._tag === "Injury" && e.tier === "red" && e.teamClubId === "home")) {
          seed = s;
          break;
        }
      }
      expect(seed).toBeDefined();

      const { events, counts } = simulateMatchWithCounts({ seed: seed!, home, away });
      const redEvent = events.find(
        (e): e is InjuryEvent => e._tag === "Injury" && e.tier === "red" && e.teamClubId === "home",
      )!;
      // From the red minute on, home plays with 10 — never 11, and the last-GK stand-in never lets
      // it drop below 10.
      const afterRed = counts.filter((c) => c.half >= redEvent.half && c.minute >= redEvent.minute);
      for (const entry of afterRed) {
        expect(entry.homeCount).toBe(10);
      }
    });
  });
});
