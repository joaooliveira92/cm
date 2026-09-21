/**
 * The substitution reconstruction as a pure table over synthetic timelines: which Substitutions are
 * goalkeeper stand-ins, which are halftime instructions, and the counts that follow. Each timeline is
 * one the engine can emit (`packages/game-engine/src/match/simulate/teamState.ts`, `loop.ts`).
 */
import type { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchEvent, MatchHalf, SubstitutionEvent } from "@cm-clone/game-engine";
import { describe, expect, it } from "vitest";
import type { LineupCommand } from "../../../src/main/match/pitch.js";
import {
  classifySubstitutions,
  countedSubstitutions,
  substitutionStatus,
} from "../../../src/main/match/substitutions.js";

const club = "me" as ClubId;
const player = (id: string) => id as PlayerId;
const half = (minute: number): MatchHalf => (minute > 45 ? 2 : 1);

const started: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: club, awayClubId: "them" as ClubId };
const halfTime: MatchEvent = { _tag: "HalfTimeReached", minute: 45, homeScore: 0, awayScore: 0 };
const fullTime: MatchEvent = { _tag: "FullTimeWhistle", minute: 90, homeScore: 0, awayScore: 0 };

const sub = (minute: number, out: string, on: string, forcedByInjury: boolean, eventHalf = half(minute)): SubstitutionEvent => ({
  _tag: "Substitution",
  minute,
  half: eventHalf,
  teamClubId: club,
  outPlayerId: player(out),
  inPlayerId: player(on),
  forcedByInjury,
});
const injury = (minute: number, playerId: string, tier: "orange" | "red", eventHalf = half(minute)): MatchEvent => ({
  _tag: "Injury",
  minute,
  half: eventHalf,
  teamClubId: club,
  playerId: player(playerId),
  trigger: "non-contact",
  severity: tier === "red" ? "severe" : "light",
  tier,
  type: "hamstring",
});
const severe = (minute: number, playerId: string, eventHalf = half(minute)) => injury(minute, playerId, "red", eventHalf);
const knock = (minute: number, playerId: string) => injury(minute, playerId, "orange");

const command = (minute: number, out: string, on: string, isHalftime = false): LineupCommand => ({
  _tag: "SubstitutionMade",
  minute,
  isHalftime,
  clubId: club,
  outPlayerId: player(out),
  inPlayerId: player(on),
});
const forceOff = (minute: number, playerId: string): LineupCommand => ({
  _tag: "ForceOffMade",
  minute,
  isHalftime: false,
  clubId: club,
  playerId: player(playerId),
});

const read = (
  events: ReadonlyArray<MatchEvent>,
  commands: ReadonlyArray<LineupCommand> = [],
  benchless: ReadonlySet<SubstitutionEvent> = new Set(),
) => {
  const { standIns, halftime } = classifySubstitutions(events, commands, benchless);
  const status = substitutionStatus(club, countedSubstitutions(events, standIns, null), halftime);
  return { standIns, halftime, status };
};

describe("classifySubstitutions — goalkeeper stand-ins by the engine's rule, not the pitch fold", () => {
  it("a bench player forced on twice is a substitution both times (a live tactics change put the first off again)", () => {
    const first = sub(70, "p", "b", true);
    const second = sub(80, "q", "b", true);
    const { standIns, status } = read([started, halfTime, severe(70, "p"), first, severe(80, "q"), second, fullTime]);
    expect(standIns.size).toBe(0);
    expect(status).toMatchObject({ used: 2, windowsUsed: 2, capReached: false });
  });

  it("a severe Injury past the substitution cap drags a player into goal, which counts for nothing", () => {
    const managerSubs = [sub(50, "a", "x1", false), sub(50, "b", "x2", false), sub(60, "c", "x3", false), sub(60, "d", "x4", false), sub(70, "e", "x5", false)];
    const drag = sub(80, "gk", "f", true);
    const { standIns, status } = read([started, halfTime, ...managerSubs, severe(80, "gk"), drag, fullTime]);
    expect([...standIns]).toEqual([drag]);
    expect(status).toMatchObject({ used: 5, windowsUsed: 3, capReached: true });
  });

  it("with every window used, a severe Injury in a new minute is dragged, and one in the last window's minute is replaced", () => {
    const managerSubs = [sub(50, "a", "x1", false), sub(60, "b", "x2", false), sub(70, "c", "x3", false)];
    const sameMinute = sub(70, "d", "x4", true);
    const drag = sub(80, "gk", "f", true);
    const { standIns, status } = read([
      started,
      halfTime,
      ...managerSubs,
      severe(70, "d"),
      sameMinute,
      severe(80, "gk"),
      drag,
      fullTime,
    ]);
    expect([...standIns]).toEqual([drag]);
    expect(status).toMatchObject({ used: 4, windowsUsed: 3 });
  });

  it("a forced Substitution not right after a severe Injury of its player is a bring-off's stand-in", () => {
    const drag = sub(30, "gk", "f", true);
    const { standIns, status } = read([started, knock(29, "gk"), drag, halfTime, fullTime], [forceOff(30, "gk")]);
    expect([...standIns]).toEqual([drag]);
    expect(status).toMatchObject({ used: 0, windowsUsed: 0 });
  });

  it("with no one left on the bench, the pitch fold's answer decides", () => {
    const drag = sub(80, "gk", "f", true);
    const { standIns, status } = read([started, halfTime, severe(80, "gk"), drag, fullTime], [], new Set([drag]));
    expect([...standIns]).toEqual([drag]);
    expect(status.used).toBe(0);
  });
});

describe("classifySubstitutions — halftime instructions and windows", () => {
  it("adjacent live minute-45 and halftime Substitutions: the live one opens a window, the halftime one does not", () => {
    const live = sub(45, "a", "x1", false);
    const atHalfTime = sub(45, "b", "x2", false);
    const { halftime, status } = read(
      [started, live, atHalfTime, halfTime, fullTime],
      [command(45, "a", "x1"), command(45, "b", "x2", true)],
    );
    expect([...halftime]).toEqual([atHalfTime]);
    expect(status).toMatchObject({ used: 2, windowsUsed: 1 });
  });

  it("a live minute-45 command the window cap refused leaves the halftime Substitution of the same pair windowless", () => {
    const atHalfTime = sub(45, "d", "x4", false);
    const { halftime, status } = read(
      [started, sub(1, "a", "x1", false), sub(2, "b", "x2", false), sub(3, "c", "x3", false), atHalfTime, halfTime, fullTime],
      [command(1, "a", "x1"), command(2, "b", "x2"), command(3, "c", "x3"), command(45, "d", "x4"), command(45, "d", "x4", true)],
    );
    expect([...halftime]).toEqual([atHalfTime]);
    expect(status).toMatchObject({ used: 4, windowsUsed: 3 });
  });

  // The engine keys a window by half and minute (ticket 29): first-half stoppage runs past 45, so its
  // minute 48 and the second half's 48 are two windows. Each row is a timeline the engine emits.
  const stoppage48 = [severe(48, "p", 1), sub(48, "p", "b", true, 1)];
  it.each([
    {
      name: "stoppage 48, then second-half 48 alone: two windows",
      events: [started, ...stoppage48, halfTime, sub(48, "c", "x2", false), fullTime],
      commands: [command(48, "c", "x2")],
      expected: { used: 2, windowsUsed: 2, capReached: false },
    },
    {
      name: "stoppage 48, then second-half 47 and 48: three windows",
      events: [started, ...stoppage48, halfTime, sub(47, "a", "x1", false), sub(48, "c", "x2", false), fullTime],
      commands: [command(47, "a", "x1"), command(48, "c", "x2")],
      expected: { used: 3, windowsUsed: 3, capReached: true },
    },
    {
      name: "two second-half substitutions at 48: one window",
      events: [started, halfTime, sub(48, "a", "x1", false), sub(48, "c", "x2", false), fullTime],
      commands: [command(48, "a", "x1"), command(48, "c", "x2")],
      expected: { used: 2, windowsUsed: 1, capReached: false },
    },
    {
      name: "a first-half stoppage injury and its replacement at 48: one window",
      events: [started, severe(48, "p", 1), sub(48, "p", "b", true, 1), severe(48, "q", 1), sub(48, "q", "b2", true, 1), halfTime, fullTime],
      commands: [],
      expected: { used: 2, windowsUsed: 1, capReached: false },
    },
  ])("$name", ({ events, commands, expected }) => {
    expect(read(events, commands).status).toMatchObject(expected);
  });

  it("stoppage 48, second-half 48 and 60 spend every window, so a severe Injury at 70 drags a player into goal", () => {
    const drag = sub(70, "gk", "f", true);
    const { standIns, status } = read(
      [started, ...stoppage48, halfTime, sub(48, "c", "x2", false), sub(60, "d", "x3", false), severe(70, "gk"), drag, fullTime],
      [command(48, "c", "x2"), command(60, "d", "x3")],
    );
    expect([...standIns]).toEqual([drag]);
    expect(status).toMatchObject({ used: 3, windowsUsed: 3, capReached: true });
  });
});
