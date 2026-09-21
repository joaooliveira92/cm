/**
 * A manager's substitution comes from the named bench, with no re-entry (group-g-match-day ticket 35,
 * decision request 04 Option A). `applyCommand` refuses an incoming player who is not named on the
 * kickoff Tactic's bench or who has already been on the pitch, and a refusal spends nothing.
 */
import { describe, expect, it } from "vitest";
import type { PlayerId } from "@cm-clone/contracts";
import type { MatchCommand } from "../../src/match/commands.js";
import type { MatchEvent, SubstitutionEvent } from "../../src/match/events.js";
import { simulateMatch } from "../../src/match/simulate/index.js";
import { applyCommand, forcePlayerOff, initTeamState, type TeamRuntimeState } from "../../src/match/simulate/teamState.js";
import type { MatchTeamSetup } from "../../src/match/types.js";
import { buildTeam, clubId, withNamedBench } from "./fixtures.js";

const HOME = clubId("home-club");
const AWAY = clubId("away-club");

/** Seed 7's squad with a named bench: the first seven non-starters in squad order. */
const setup = withNamedBench(buildTeam(HOME, 7).setup);
const starter = (index: number): PlayerId => setup.tactic.slots[index]!.playerId;
const bench = setup.tactic.bench.filter((id): id is PlayerId => id !== null);
const benchSet = new Set(bench);
const starters = new Set(setup.tactic.slots.map((slot) => slot.playerId));
/** A squad player who is neither in the XI nor on the bench. */
const offBench = setup.squad.map((player) => player.id).find((id) => !starters.has(id) && !benchSet.has(id))!;

const substitute = (team: TeamRuntimeState, outPlayerId: PlayerId, inPlayerId: PlayerId, minute = 20) =>
  applyCommand(team, { _tag: "MakeSubstitution", clubId: HOME, outPlayerId, inPlayerId }, minute, 1, false);

/** What a refused command must leave untouched. */
const spend = (team: TeamRuntimeState) => ({
  substitutionsUsed: team.substitutionsUsed,
  windowsUsed: team.windowsUsed,
  lastWindow: team.lastWindow,
  onPitch: team.resolved.slots.map((slot) => slot.playerId),
  beenOn: [...team.beenOn],
});

describe("applyCommand — a manager's substitute comes from the named bench", () => {
  it("the fixture holds: a squad player off the bench exists", () => {
    expect(offBench).toBeDefined();
    expect(bench).toHaveLength(7);
  });

  it("accepts a bench player who has never been on", () => {
    const team = initTeamState(setup);
    expect(substitute(team, starter(5), bench[0]!)).toEqual({ accepted: true });
    expect(team.resolved.slots.map((slot) => slot.playerId)).toContain(bench[0]);
  });

  it("refuses a squad player not named on the bench, with a reason", () => {
    const team = initTeamState(setup);
    expect(substitute(team, starter(5), offBench)).toEqual({ accepted: false, reason: `${offBench} is not named on the bench` });
  });

  it("refuses a bench player substituted off earlier", () => {
    const team = initTeamState(setup);
    expect(substitute(team, starter(5), bench[0]!).accepted).toBe(true);
    expect(substitute(team, bench[0]!, bench[1]!).accepted).toBe(true);
    expect(substitute(team, starter(6), bench[0]!)).toEqual({ accepted: false, reason: `${bench[0]} has already been on the pitch` });
  });

  it("refuses a bench player who came on and was sent off", () => {
    const team = initTeamState(setup);
    expect(substitute(team, starter(5), bench[0]!).accepted).toBe(true);
    // A red card removes the slot outright (`resolveCards`).
    team.resolved.slots = team.resolved.slots.filter((slot) => slot.playerId !== bench[0]);
    expect(substitute(team, starter(6), bench[0]!)).toEqual({ accepted: false, reason: `${bench[0]} has already been on the pitch` });
  });

  it("refuses a bench player who came on and was injured off", () => {
    const team = initTeamState(setup);
    expect(substitute(team, starter(5), bench[0]!).accepted).toBe(true);
    const events: Array<MatchEvent> = [];
    forcePlayerOff(team, bench[0]!, 30, 1, events);
    expect(events).toMatchObject([{ _tag: "Substitution", outPlayerId: bench[0], forcedByInjury: true }]);
    expect(substitute(team, starter(6), bench[0]!, 40)).toEqual({ accepted: false, reason: `${bench[0]} has already been on the pitch` });
  });

  it("refuses a starter named on the bench once he has been substituted off", () => {
    const withStarterOnBench: MatchTeamSetup = {
      ...setup,
      tactic: { ...setup.tactic, bench: [starter(5), ...setup.tactic.bench.slice(1)] },
    };
    const team = initTeamState(withStarterOnBench);
    expect(substitute(team, starter(5), bench[1]!).accepted).toBe(true);
    expect(substitute(team, starter(6), starter(5))).toEqual({ accepted: false, reason: `${starter(5)} has already been on the pitch` });
  });

  it("a refused command spends no substitution and opens no window", () => {
    const team = initTeamState(setup);
    expect(substitute(team, starter(1), bench[0]!, 10).accepted).toBe(true);
    expect(substitute(team, starter(2), bench[1]!, 20).accepted).toBe(true);
    expect(substitute(team, bench[0]!, bench[2]!, 20).accepted).toBe(true);
    const before = spend(team);

    // Each at a fresh minute, which would open the third and last window if accepted.
    expect(substitute(team, starter(3), offBench, 30).accepted).toBe(false);
    expect(substitute(team, starter(3), bench[0]!, 31).accepted).toBe(false);

    expect(spend(team)).toEqual(before);
    // The last window is still there for a valid substitution.
    expect(substitute(team, starter(3), bench[3]!, 32)).toEqual({ accepted: true });
    expect(team.windowsUsed).toBe(3);
  });

  it("the bench is fixed at kickoff: a mid-match ChangeTactics naming another does not change who may come on", () => {
    const team = initTeamState(setup);
    const newBench = [offBench, null, null, null, null, null, null];
    expect(applyCommand(team, { _tag: "ChangeTactics", clubId: HOME, tactic: { ...setup.tactic, bench: newBench } }, 50, 2, false)).toEqual({
      accepted: true,
    });
    expect(substitute(team, starter(5), offBench, 55)).toEqual({ accepted: false, reason: `${offBench} is not named on the bench` });
    expect(substitute(team, starter(5), bench[0]!, 55)).toEqual({ accepted: true });
  });
});

describe("simulateMatch — seeded: a journaled substitution off the bench, or of a been-on player, does not happen", () => {
  // Seed 1: the unscheduled match gives the home side no red card, severe Injury or Substitution.
  const seed = 1;
  const home = withNamedBench(buildTeam(HOME, seed).setup);
  const away = withNamedBench(buildTeam(AWAY, seed + 1000).setup);
  const homeStarters = home.tactic.slots.map((slot) => slot.playerId);
  const homeBench = home.tactic.bench.filter((id): id is PlayerId => id !== null);
  const homeStarterSet = new Set(homeStarters);
  const homeOffBench = home.squad.map((player) => player.id).find((id) => !homeStarterSet.has(id) && !homeBench.includes(id))!;
  const sub = (outPlayerId: PlayerId, inPlayerId: PlayerId): MatchCommand => ({ _tag: "MakeSubstitution", clubId: HOME, outPlayerId, inPlayerId });

  const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
    [20, [sub(homeStarters[5]!, homeOffBench)]],
    [30, [sub(homeStarters[5]!, homeBench[0]!)]],
    [40, [sub(homeBench[0]!, homeBench[1]!)]],
    [60, [sub(homeStarters[6]!, homeBench[0]!), sub(homeStarters[6]!, homeStarters[5]!)]],
  ]);
  const events = simulateMatch({ seed, home, away, commandsByMinute });
  const homeSubs = events.filter((event): event is SubstitutionEvent => event._tag === "Substitution" && event.teamClubId === HOME);

  it("the fixture holds: no home red card or severe Injury in the scheduled match", () => {
    expect(
      events.some((event) => (event._tag === "RedCard" || (event._tag === "Injury" && event.tier === "red")) && event.teamClubId === HOME),
    ).toBe(false);
  });

  it("only the two bench substitutions are applied; the off-bench and re-entry ones are refused", () => {
    expect(homeSubs.map((event) => [event.minute, event.outPlayerId, event.inPlayerId])).toEqual([
      [30, homeStarters[5], homeBench[0]],
      [40, homeBench[0], homeBench[1]],
    ]);
  });
});
