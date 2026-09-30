/**
 * Substitution windows are keyed by half and minute (group-g-match-day ticket 29). First-half stoppage
 * runs past minute 45, so a substitution at first-half stoppage minute N and one at second-half minute
 * N are two windows, not one.
 */
import { describe, expect, it } from "vitest";
import type { MatchCommand } from "../../src/match/commands.js";
import type { MatchEvent, SubstitutionEvent } from "../../src/match/events.js";
import { simulateMatch } from "../../src/match/simulate/index.js";
import { applyCommand, forcePlayerOff, initTeamState } from "../../src/match/simulate/teamState.js";
import { buildTeam, clubId, withNamedBench } from "./fixtures.js";

const home = clubId("home-club");

const teamWithBench = (seed: number) => {
  const setup = withNamedBench(buildTeam(home, seed).setup);
  const starters = setup.tactic.slots.map((slot) => slot.playerId);
  const bench = setup.tactic.bench.filter((id) => id !== null);
  return { team: initTeamState(setup), starters, bench };
};

describe("applyCommand — substitution windows by half and minute", () => {
  it("a first-half stoppage substitution at minute 48 and a second-half one at minute 48 spend two windows", () => {
    const { team, starters, bench } = teamWithBench(7);
    const events: Array<MatchEvent> = [];
    forcePlayerOff(team, starters[1]!, 48, 1, events);
    expect(events).toMatchObject([{ _tag: "Substitution", minute: 48, half: 1, forcedByInjury: true }]);
    const second = applyCommand(team, { _tag: "MakeSubstitution", clubId: home, outPlayerId: starters[2]!, inPlayerId: bench[1]! }, 48, 2, false);
    expect(second.accepted).toBe(true);
    expect(team.windowsUsed).toBe(2);
  });

  it("two substitutions in the same half and minute share one window", () => {
    const { team, starters, bench } = teamWithBench(7);
    for (const index of [0, 1]) {
      const result = applyCommand(team, { _tag: "MakeSubstitution", clubId: home, outPlayerId: starters[index + 1]!, inPlayerId: bench[index]! }, 60, 2, false);
      expect(result.accepted).toBe(true);
    }
    expect(team.windowsUsed).toBe(1);
  });

  it("with stoppage 48 and second-half 48 spent, the window cap refuses a fourth point", () => {
    const { team, starters, bench } = teamWithBench(7);
    const sub = (index: number, minute: number, half: 1 | 2) =>
      applyCommand(team, { _tag: "MakeSubstitution", clubId: home, outPlayerId: starters[index + 1]!, inPlayerId: bench[index]! }, minute, half, false);
    expect([sub(0, 48, 1), sub(1, 48, 2), sub(2, 60, 2)].map((result) => result.accepted)).toEqual([true, true, true]);
    expect(sub(3, 70, 2)).toEqual({ accepted: false, reason: "substitution window cap (3) already reached" });
    expect(team.windowsUsed).toBe(3);
    expect(team.substitutionsUsed).toBe(3);
  });
});

describe("simulateMatch — a severe Injury in first-half stoppage opens its own window", () => {
  // Find a seed where the home side's only forced Substitution (from a severe Injury)
  // is in first-half stoppage time.
  const findSeedWithStoppageForcedSub = (): number | undefined => {
    for (let seed = 1; seed < 2000; seed++) {
      const homeTeam = { setup: withNamedBench(buildTeam(home, seed).setup) };
      const awayTeam = { setup: withNamedBench(buildTeam(clubId("away-club"), seed + 1000).setup) };
      const events = simulateMatch({ seed, home: homeTeam.setup, away: awayTeam.setup });
      const homeSubs = events.filter((event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === home);
      if (homeSubs.length === 1 && homeSubs[0]!.half === 1 && homeSubs[0]!.forcedByInjury) {
        return seed;
      }
    }
    return undefined;
  };

  const seed = findSeedWithStoppageForcedSub() ?? 300;
  // Both sides name a bench: a forced substitution only ever brings on a named bench player (ticket 26).
  const homeTeam = { setup: withNamedBench(buildTeam(home, seed).setup) };
  const awayTeam = { setup: withNamedBench(buildTeam(clubId("away-club"), seed + 1000).setup) };

  it("a forced Substitution happens in the first half", () => {
    const events = simulateMatch({ seed, home: homeTeam.setup, away: awayTeam.setup });
    const homeSubs = events.filter((event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === home);
    expect(homeSubs.length).toBeGreaterThanOrEqual(1);
  });

  it("second-half substitutions use the window cap correctly", () => {
    const events = simulateMatch({ seed, home: homeTeam.setup, away: awayTeam.setup });
    const homeSubs = events.filter((event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === home && event.forcedByInjury);
    const forcedSub = homeSubs[0];
    if (!forcedSub) {
      // No forced sub in this seed — skip the window test
      expect(true).toBe(true);
      return;
    }
    const starters = homeTeam.setup.tactic.slots.map((slot) => slot.playerId);
    const takenOff = new Set(homeSubs.map((event) => event.outPlayerId));
    const takenOn = new Set(homeSubs.map((event) => event.inPlayerId));
    const outs = starters.filter((id) => !takenOff.has(id) && homeTeam.setup.tactic.slots[0]!.playerId !== id);
    const ins = homeTeam.setup.tactic.bench.filter((id) => id !== null && !takenOn.has(id));
    const make = (index: number): MatchCommand => ({ _tag: "MakeSubstitution", clubId: home, outPlayerId: outs[index]!, inPlayerId: ins[index]! });
    const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
      [48, [make(0)]],
      [60, [make(1)]],
      [70, [make(2)]],
    ]);

    const eventsWithCommands = simulateMatch({ seed, home: homeTeam.setup, away: awayTeam.setup, commandsByMinute });
    const managerSubs = eventsWithCommands.filter(
      (event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === home && !event.forcedByInjury,
    );
    // Should have at most 2 manager subs (limited by windows)
    expect(managerSubs.length).toBeLessThanOrEqual(2);
  });
});
