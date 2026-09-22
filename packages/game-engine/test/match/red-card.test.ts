/**
 * A red card leaves through the same exit as a bring-off (group-g-match-day ticket 36, decision
 * request 06 Option A): the team plays with 10 and spends no substitution or window, and when the
 * player sent off is the last goalkeeper on the pitch, an outfield player already on it moves into
 * goal as a stand-in. A red card to an outfielder, or to a keeper with another on the pitch, only
 * empties the slot.
 */
import type { PlayerId } from "@cm-clone/contracts";
import { POSITION_ROLES, type RandomSource } from "@cm-clone/shared";
import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../src/match/events.js";
import { simulateMatchWithCounts } from "../../src/match/simulate/index.js";
import { resolveCards } from "../../src/match/simulate/resolvers.js";
import { initTeamState, type TeamRuntimeState } from "../../src/match/simulate/teamState.js";
import type { MatchTeamSetup } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId } from "./fixtures.js";

const HOME = makeClubId("home-club");
const AWAY = makeClubId("away-club");

const keeperOf = (team: TeamRuntimeState): PlayerId | undefined => team.resolved.slots.find((slot) => slot.isGoalkeeper)?.playerId;
const onPitch = (team: TeamRuntimeState): ReadonlyArray<PlayerId> => team.resolved.slots.map((slot) => slot.playerId);

/** `setup` with the reserve keeper in outfield slot 5, played as a second goalkeeper. */
const withSecondKeeper = (setup: MatchTeamSetup): MatchTeamSetup => {
  const starters = new Set(setup.tactic.slots.map((slot) => slot.playerId));
  const reserveKeeper = setup.squad.find((player) => !starters.has(player.id) && player.attributes.gkHandling != null)!;
  const slots = setup.tactic.slots.map((slot, index) =>
    index === 5 ? { position: "GK" as const, role: POSITION_ROLES.GK, playerId: reserveKeeper.id } : slot,
  );
  return { ...setup, tactic: { ...setup.tactic, slots } };
};

/** Draws a card (0), picks slot `index` of `slotCount`, and makes it red (0). */
const redCardTo = (index: number, slotCount: number): RandomSource => {
  const draws = [0, (index + 0.5) / slotCount, 0];
  return { next: () => draws.shift()! };
};

const sendOff = (setup: MatchTeamSetup, slotIndex: number) => {
  const team = initTeamState(setup);
  const before = onPitch(team);
  const events: Array<MatchEvent> = [];
  resolveCards(team, 30, 1, redCardTo(slotIndex, before.length), events);
  return { team, before, events, sentOff: before[slotIndex]! };
};

describe("resolveCards' red card", () => {
  const setup = buildTeam(HOME, 7).setup;
  const keeperSlot = setup.tactic.slots.findIndex((slot) => slot.position === "GK");

  it("to the last goalkeeper moves an outfield player already on the pitch into goal, spending nothing", () => {
    const { team, before, events, sentOff } = sendOff(setup, keeperSlot);
    const standIn = keeperOf(team)!;

    expect(events).toEqual([
      { _tag: "RedCard", minute: 30, half: 1, teamClubId: HOME, playerId: sentOff },
      { _tag: "Substitution", minute: 30, half: 1, teamClubId: HOME, outPlayerId: sentOff, inPlayerId: standIn, forcedByInjury: true },
    ]);
    expect(before).toContain(standIn);
    expect(onPitch(team)).toHaveLength(10);
    expect(onPitch(team)).not.toContain(sentOff);
    expect(team.gkStandIns.has(standIn)).toBe(true);
    expect(team.substitutionsUsed).toBe(0);
    expect(team.windowsUsed).toBe(0);
  });

  it("to an outfielder only empties his slot", () => {
    const { team, before, events, sentOff } = sendOff(setup, 5);

    expect(events).toEqual([{ _tag: "RedCard", minute: 30, half: 1, teamClubId: HOME, playerId: sentOff }]);
    expect(onPitch(team)).toEqual(before.filter((id) => id !== sentOff));
    expect(keeperOf(team)).toBe(before[keeperSlot]);
    expect(team.gkStandIns.size).toBe(0);
  });

  it("to a keeper with another keeper on the pitch only empties his slot", () => {
    const twoKeepers = withSecondKeeper(setup);
    const { team, before, events, sentOff } = sendOff(twoKeepers, keeperSlot);

    expect(events).toEqual([{ _tag: "RedCard", minute: 30, half: 1, teamClubId: HOME, playerId: sentOff }]);
    expect(onPitch(team)).toEqual(before.filter((id) => id !== sentOff));
    expect(keeperOf(team)).toBe(twoKeepers.tactic.slots[5]!.playerId);
    expect(team.gkStandIns.size).toBe(0);
  });
});

/** The simulation's own draws: a seed, the home side built from it and the away side from seed + 1000. */
const seeded = (seed: number, home: MatchTeamSetup = buildTeam(HOME, seed).setup) =>
  simulateMatchWithCounts({ seed, home, away: buildTeam(AWAY, seed + 1000).setup });

const countsFrom = (counts: ReturnType<typeof seeded>["counts"], clubId: typeof HOME, half: 1 | 2, minute: number) =>
  counts
    .filter((entry) => entry.half > half || (entry.half === half && entry.minute >= minute))
    .map((entry) => (clubId === HOME ? entry.homeCount : entry.awayCount));

describe("a simulated match's red card", () => {
  it("seed 32: the away keeper sent off at 32' leaves an outfield stand-in in goal, and 10 men to the end", () => {
    const { events, counts } = seeded(32);
    const red = events.findIndex((event) => event._tag === "RedCard");

    expect(events[red]).toMatchObject({ _tag: "RedCard", teamClubId: AWAY, half: 1, minute: 32, playerId: "away-club-p0" });
    expect(events[red + 1]).toEqual({
      _tag: "Substitution",
      minute: 32,
      half: 1,
      teamClubId: AWAY,
      outPlayerId: "away-club-p0",
      inPlayerId: "away-club-p3",
      forcedByInjury: true,
    });
    expect(new Set(countsFrom(counts, AWAY, 1, 32))).toEqual(new Set([10]));
  });

  it("seed 506: a keeper sent off at 59' now concedes the equaliser a keeperless side kept out (was 1-0, now 1-1)", () => {
    // Before ticket 36 the side played on with no goalkeeper slot at all, which left its defence
    // averaged over the outfield defenders only; the stand-in's gk=1 now drags it down.
    const { events } = seeded(506);

    expect(events.find((event) => event._tag === "RedCard")).toMatchObject({ teamClubId: HOME, half: 2, minute: 59, playerId: "home-club-p0" });
    expect(events.at(-1)).toMatchObject({ _tag: "FullTimeWhistle", homeScore: 1, awayScore: 1 });
  });

  it("seed 7: an outfielder sent off at 85' brings no one into goal", () => {
    const { events, counts } = seeded(7);
    const red = events.findIndex((event) => event._tag === "RedCard");

    expect(events[red]).toMatchObject({ _tag: "RedCard", teamClubId: AWAY, half: 2, minute: 85, playerId: "away-club-p16" });
    expect(events.slice(red + 1).some((event) => event._tag === "Substitution" && event.teamClubId === AWAY)).toBe(false);
    expect(new Set(countsFrom(counts, AWAY, 2, 85))).toEqual(new Set([10]));
  });

  it("seed 284: a keeper sent off with a second keeper on the pitch brings no one into goal", () => {
    const home = withSecondKeeper(buildTeam(HOME, 284).setup);
    const keepers = home.tactic.slots.filter((slot) => slot.position === "GK").map((slot) => slot.playerId);
    const { events, counts } = seeded(284, home);
    const red = events.findIndex((event) => event._tag === "RedCard" && keepers.includes(event.playerId));

    expect(events[red]).toMatchObject({ _tag: "RedCard", teamClubId: HOME, half: 1, minute: 39, playerId: "home-club-p0" });
    expect(events.slice(red + 1).some((event) => event._tag === "Substitution" && event.teamClubId === HOME)).toBe(false);
    // Ten from the red card on; a later severe Injury, with no bench named, takes the side to nine.
    expect(countsFrom(counts, HOME, 1, 39)[0]).toBe(10);
  });
});
