import { describe, expect, it } from "vitest";
import type { MatchCommand } from "../../src/match/commands.js";
import { simulateMatch, type SimulateMatchInput } from "../../src/match/simulate.js";
import { buildTeam } from "./fixtures.js";

const baseInput = (seed: number): SimulateMatchInput => ({
  seed,
  home: buildTeam("home-club", seed).setup,
  away: buildTeam("away-club", seed + 1000).setup,
});

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
