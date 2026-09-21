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
  // Seed 300: the home side's only Substitution of the unscheduled match is forced by a severe Injury
  // in first-half stoppage minute 48.
  const seed = 300;
  // Both sides name a bench: a forced substitution only ever brings on a named bench player (ticket 26).
  const homeTeam = { setup: withNamedBench(buildTeam(home, seed).setup) };
  const awayTeam = { setup: withNamedBench(buildTeam(clubId("away-club"), seed + 1000).setup) };

  it("the fixture holds: the forced Substitution sits at first-half minute 48", () => {
    const events = simulateMatch({ seed, home: homeTeam.setup, away: awayTeam.setup });
    const homeSubs = events.filter((event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === home);
    expect(homeSubs).toMatchObject([{ minute: 48, half: 1, forcedByInjury: true }]);
  });

  it("second-half substitutions at 48 and 60 use the last two windows, so one at 70 is refused", () => {
    const starters = homeTeam.setup.tactic.slots.map((slot) => slot.playerId);
    const unscheduledHomeSubs = simulateMatch({ seed, home: homeTeam.setup, away: awayTeam.setup }).filter(
      (event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === home,
    );
    const takenOff = new Set(unscheduledHomeSubs.map((event) => event.outPlayerId));
    const takenOn = new Set(unscheduledHomeSubs.map((event) => event.inPlayerId));
    const outs = starters.filter((id) => !takenOff.has(id) && homeTeam.setup.tactic.slots[0]!.playerId !== id);
    const ins = homeTeam.setup.tactic.bench.filter((id) => id !== null && !takenOn.has(id));
    const make = (index: number): MatchCommand => ({ _tag: "MakeSubstitution", clubId: home, outPlayerId: outs[index]!, inPlayerId: ins[index]! });
    const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
      [48, [make(0)]],
      [60, [make(1)]],
      [70, [make(2)]],
    ]);

    const events = simulateMatch({ seed, home: homeTeam.setup, away: awayTeam.setup, commandsByMinute });
    const managerSubs = events.filter(
      (event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === home && !event.forcedByInjury,
    );
    expect(managerSubs.map((event) => [event.half, event.minute])).toEqual([
      [2, 48],
      [2, 60],
    ]);
  });
});
