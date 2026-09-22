/**
 * Who a forced substitution brings on (group-g-match-day ticket 26, decision request 04 Option A):
 * an entry of the kickoff Tactic's named bench that is in the match squad and has never been on the
 * pitch this match. Like for like first (a goalkeeper for a goalkeeper, an outfielder for an
 * outfielder), in bench order; with no like-for-like entry, the first in bench order. With none, the
 * team plays with 10. Squad order plays no part.
 */
import type { PlayerId } from "@cm-clone/contracts";
import { describe, expect, it } from "vitest";
import type { MatchEvent, SubstitutionEvent } from "../../src/match/events.js";
import { simulateMatch, simulateMatchWithCounts } from "../../src/match/simulate/index.js";
import { applyCommand, applyForcedOff, computeTeamStrengths, forcePlayerOff, initTeamState, type TeamRuntimeState } from "../../src/match/simulate/teamState.js";
import type { MatchTeamSetup } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId, playerId as makePlayerId, withNamedBench } from "./fixtures.js";

const HOME = makeClubId("home");
const AWAY = makeClubId("away");

const onPitch = (team: TeamRuntimeState): ReadonlyArray<PlayerId> => team.resolved.slots.map((slot) => slot.playerId);

const forcedIns = (events: ReadonlyArray<MatchEvent>, clubId = HOME): ReadonlyArray<PlayerId> =>
  events
    .filter((event): event is SubstitutionEvent => event._tag === "Substitution" && event.forcedByInjury && event.teamClubId === clubId)
    .map((event) => event.inPlayerId);

/** Seed 7's generated squad (25 players) with the given bench, padded to seven entries. */
const setupWithBench = (bench: ReadonlyArray<PlayerId | null>): MatchTeamSetup => {
  const { setup } = buildTeam(HOME, 7);
  const padded = [...bench, ...Array<null>(Math.max(0, 7 - bench.length)).fill(null)];
  return { ...setup, tactic: { ...setup.tactic, bench: padded } };
};

const starter = (setup: MatchTeamSetup, index: number): PlayerId => setup.tactic.slots[index]!.playerId;

/** The squad players outside the XI, in squad order. */
const nonStarters = (setup: MatchTeamSetup): ReadonlyArray<PlayerId> => {
  const starters = new Set(setup.tactic.slots.map((slot) => slot.playerId));
  return setup.squad.map((player) => player.id).filter((id) => !starters.has(id));
};

const base = buildTeam(HOME, 7).setup;
const reserves = nonStarters(base);
const isKeeper = (id: PlayerId): boolean => base.squad.find((player) => player.id === id)!.attributes.gkHandling != null;
/** Seed 7's reserves split by the engine's goalkeeper test, each in squad order. */
const benchKeepers = reserves.filter(isKeeper);
const benchOutfielders = reserves.filter((id) => !isKeeper(id));
/** The XI's goalkeeper and an outfield starter. */
const KEEPER_SLOT = base.tactic.slots.findIndex((slot) => slot.position === "GK");
const OUTFIELD_SLOT = 5;

const substitute = (team: TeamRuntimeState, outPlayerId: PlayerId, inPlayerId: PlayerId, minute: number) =>
  applyCommand(team, { _tag: "MakeSubstitution", clubId: HOME, outPlayerId, inPlayerId }, minute, 1, false);

/** A red card leaves through `applyForcedOff` (`resolveCards`, ticket 36); model it the same way. */
const sendOff = (team: TeamRuntimeState, playerId: PlayerId): void => {
  applyForcedOff(team, playerId, 25, 1, []);
};

describe("forcePlayerOff's replacement", () => {
  it("is the first named bench entry, in bench order, not the first by squad order or id", () => {
    // Bench order runs against squad order, so squad order would pick reserves[0] and bench order reserves[4].
    const setup = setupWithBench([reserves[4]!, reserves[2]!, reserves[0]!]);
    const team = initTeamState(setup);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, 5), 30, 1, events);

    expect(forcedIns(events)).toEqual([reserves[4]]);
    expect(onPitch(team)).toContain(reserves[4]);
  });

  it("skips a bench player who has already been on and gone off again", () => {
    // The starter cannot come back on for reserves[0] (ticket 35), so a third bench player replaces him.
    const setup = setupWithBench([benchOutfielders[0]!, benchOutfielders[1]!, benchOutfielders[2]!]);
    const team = initTeamState(setup);
    expect(substitute(team, starter(setup, 5), benchOutfielders[0]!, 20).accepted).toBe(true);
    expect(substitute(team, benchOutfielders[0]!, benchOutfielders[2]!, 20).accepted).toBe(true);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, 6), 30, 1, events);

    expect(forcedIns(events)).toEqual([benchOutfielders[1]]);
  });

  it("never brings back a player who was sent off or injured off, even when the bench names him", () => {
    // The bench names a starter who is then sent off, and the injured player's replacement is sent off too.
    const setup = setupWithBench([starter(base, 4), reserves[0]!, reserves[1]!]);
    const team = initTeamState(setup);
    const events: Array<MatchEvent> = [];
    sendOff(team, starter(setup, 4));

    forcePlayerOff(team, starter(setup, 5), 30, 1, events);
    sendOff(team, reserves[0]!);
    forcePlayerOff(team, starter(setup, 6), 31, 1, events);
    forcePlayerOff(team, reserves[1]!, 32, 1, events);

    // The third forced substitution finds no one: the sent-off starter, the sent-off substitute, the
    // injured starters and the injured substitute have all been on.
    expect(forcedIns(events)).toEqual([reserves[0], reserves[1]]);
    expect(onPitch(team)).not.toContain(starter(setup, 5));
    expect(onPitch(team)).not.toContain(starter(setup, 6));
    expect(onPitch(team)).toHaveLength(8);
  });

  it("leaves the team with 10 once the bench is exhausted, spending no substitution", () => {
    const setup = setupWithBench([reserves[0]!]);
    const team = initTeamState(setup);
    const first: Array<MatchEvent> = [];
    forcePlayerOff(team, starter(setup, 5), 30, 1, first);
    expect(forcedIns(first)).toEqual([reserves[0]]);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, 6), 40, 1, events);

    expect(events).toEqual([]);
    expect(onPitch(team)).toHaveLength(10);
    expect(onPitch(team)).not.toContain(starter(setup, 6));
    expect(team.substitutionsUsed).toBe(1);
  });

  it("never chooses a squad player off the named bench, nor a bench entry outside the match squad", () => {
    const setup = setupWithBench([makePlayerId("not-in-the-squad"), null]);
    const team = initTeamState(setup);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, 5), 30, 1, events);

    // The squad has players outside the XI, and none of them is named on the bench.
    expect(reserves.length).toBeGreaterThan(0);
    expect(events).toEqual([]);
    expect(onPitch(team)).toHaveLength(10);
    expect(team.substitutionsUsed).toBe(0);
  });

  it("is the same whatever order the squad arrives in", () => {
    const setup = setupWithBench([reserves[3]!, reserves[1]!]);
    const reversed: MatchTeamSetup = { ...setup, squad: [...setup.squad].reverse() };
    const rotated: MatchTeamSetup = { ...setup, squad: [...setup.squad.slice(7), ...setup.squad.slice(0, 7)] };

    const replacements = [setup, reversed, rotated].map((variant) => {
      const team = initTeamState(variant);
      const events: Array<MatchEvent> = [];
      forcePlayerOff(team, starter(variant, 5), 30, 1, events);
      forcePlayerOff(team, starter(variant, 6), 40, 1, events);
      return forcedIns(events);
    });

    expect(replacements).toEqual([
      [reserves[3], reserves[1]],
      [reserves[3], reserves[1]],
      [reserves[3], reserves[1]],
    ]);
  });

  it("keeps the kickoff bench through a mid-match ChangeTactics that names another", () => {
    const setup = setupWithBench([reserves[0]!, reserves[1]!]);
    const team = initTeamState(setup);
    const newBench = [reserves[5]!, reserves[6]!, null, null, null, null, null];
    expect(applyCommand(team, { _tag: "ChangeTactics", clubId: HOME, tactic: { ...setup.tactic, bench: newBench } }, 20, 1, false).accepted).toBe(true);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, 5), 30, 1, events);

    expect(forcedIns(events)).toEqual([reserves[0]]);
  });

  it("still brings on a bench player a live ChangeTactics named in its XI: the command put no one on (ticket 40)", () => {
    const setup = setupWithBench([reserves[0]!, reserves[1]!]);
    const team = initTeamState(setup);
    const withReserveOn = {
      ...setup.tactic,
      slots: setup.tactic.slots.map((slot, index) => (index === 5 ? { ...slot, playerId: reserves[0]! } : slot)),
      bench: [starter(setup, 5), reserves[1]!, null, null, null, null, null],
    };
    applyCommand(team, { _tag: "ChangeTactics", clubId: HOME, tactic: withReserveOn }, 20, 1, false);
    expect(onPitch(team)).toEqual(setup.tactic.slots.map((slot) => slot.playerId));
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, 6), 30, 1, events);

    expect(forcedIns(events)).toEqual([reserves[0]]);
  });
});

describe("forcePlayerOff's replacement, like for like", () => {
  it("seed 7 has two reserve keepers and an outfield starter in slot 5", () => {
    expect(benchKeepers.length).toBeGreaterThanOrEqual(2);
    expect(benchOutfielders.length).toBeGreaterThanOrEqual(2);
    expect(isKeeper(starter(base, KEEPER_SLOT))).toBe(true);
    expect(isKeeper(starter(base, OUTFIELD_SLOT))).toBe(false);
  });

  it("an outfield injury skips a bench keeper listed first and brings on the first outfield bench player", () => {
    const setup = setupWithBench([benchKeepers[0]!, benchOutfielders[1]!, benchOutfielders[0]!]);
    const team = initTeamState(setup);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, OUTFIELD_SLOT), 30, 1, events);

    expect(forcedIns(events)).toEqual([benchOutfielders[1]]);
    expect(onPitch(team)).not.toContain(benchKeepers[0]);
    // An outfielder replacing an outfielder stands in for no keeper (ticket 36).
    expect(team.gkStandIns.size).toBe(0);
  });

  it("flagging an outfielder as a stand-in moves no strength: a missing Goalkeeping attribute already rates 1", () => {
    // Why restricting stand-ins to the goalkeeper slot (ticket 36) replays every seed unchanged.
    const setup = setupWithBench([benchOutfielders[0]!]);
    const team = initTeamState(setup);
    forcePlayerOff(team, starter(setup, OUTFIELD_SLOT), 30, 1, []);
    const unflagged = computeTeamStrengths(team);
    team.gkStandIns.add(benchOutfielders[0]!);

    expect(computeTeamStrengths(team)).toEqual(unflagged);
  });

  it("a keeper injury brings on the bench keeper even when he is listed after outfielders", () => {
    const setup = setupWithBench([benchOutfielders[0]!, benchOutfielders[1]!, benchKeepers[0]!]);
    const team = initTeamState(setup);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, KEEPER_SLOT), 30, 1, events);

    expect(forcedIns(events)).toEqual([benchKeepers[0]]);
    expect(team.resolved.slots.find((slot) => slot.isGoalkeeper)!.playerId).toBe(benchKeepers[0]);
    expect(team.gkStandIns.has(benchKeepers[0]!)).toBe(false);
  });

  it("an outfield injury with only a keeper left on the bench brings the keeper on", () => {
    const setup = setupWithBench([benchOutfielders[0]!, benchKeepers[0]!]);
    const team = initTeamState(setup);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, OUTFIELD_SLOT), 30, 1, events);
    forcePlayerOff(team, starter(setup, OUTFIELD_SLOT + 1), 40, 1, events);

    expect(forcedIns(events)).toEqual([benchOutfielders[0], benchKeepers[0]]);
    expect(onPitch(team)).toHaveLength(11);
  });

  it("a keeper injury with no bench keeper brings on the first outfielder, as a stand-in", () => {
    const setup = setupWithBench([benchOutfielders[1]!, benchOutfielders[0]!]);
    const team = initTeamState(setup);
    const events: Array<MatchEvent> = [];

    forcePlayerOff(team, starter(setup, KEEPER_SLOT), 30, 1, events);

    expect(forcedIns(events)).toEqual([benchOutfielders[1]]);
    expect(team.resolved.slots.find((slot) => slot.isGoalkeeper)!.playerId).toBe(benchOutfielders[1]);
    expect(team.gkStandIns.has(benchOutfielders[1]!)).toBe(true);
  });
});

describe("a simulated match's forced substitutions", () => {
  // Seed 210: with a named bench, the home side has two forced substitutions (minutes 63 and 90).
  const seed = 210;
  const namedHome = withNamedBench(buildTeam(HOME, seed).setup);
  const reversedBench: MatchTeamSetup = {
    ...namedHome,
    tactic: { ...namedHome.tactic, bench: [...namedHome.tactic.bench].reverse() },
  };
  const away = withNamedBench(buildTeam(AWAY, seed + 1000).setup);

  it("brings on the named bench in bench order, each player once", () => {
    const events = simulateMatch({ seed, home: reversedBench, away });
    const bench = reversedBench.tactic.bench;

    expect(forcedIns(events)).toEqual([bench[0], bench[1]]);
    expect(forcedIns(events)).toEqual([makePlayerId("home-p11"), makePlayerId("home-p10")]);
  });

  it("replays identically with both squads in reverse order", () => {
    const inOrder = simulateMatch({ seed, home: reversedBench, away });
    const reversed = simulateMatch({
      seed,
      home: { ...reversedBench, squad: [...reversedBench.squad].reverse() },
      away: { ...away, squad: [...away.squad].reverse() },
    });

    expect(reversed).toEqual(inOrder);
  });

  it("with no named bench, a severe Injury leaves the side with 10 and brings no one on", () => {
    const benchless = buildTeam(HOME, seed).setup;
    const { events, counts } = simulateMatchWithCounts({ seed, home: benchless, away });
    const severe = events.filter((event) => event._tag === "Injury" && event.tier === "red" && event.teamClubId === HOME);

    expect(severe.length).toBeGreaterThan(0);
    expect(forcedIns(events)).toEqual([]);
    expect(counts.at(-1)!.homeCount).toBeLessThan(11);
  });
});
