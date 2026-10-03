/**
 * A live command never changes play the manager has already been shown (group-g-match-day ticket 20,
 * decision request 08 Option A). Stamped with `nextCommandMinute`, a command given after any number of
 * revealed Match Events leaves every one of those events exactly as it was.
 */
import { describe, expect, it } from "vitest";
import type { MatchCommand } from "../../src/match/commands.js";
import { nextCommandMinute } from "../../src/match/commandTiming.js";
import type { MatchEvent } from "../../src/match/events.js";
import { simulateMatch } from "../../src/match/simulate/index.js";
import type { MatchTactic } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId } from "./fixtures.js";

const HOME = makeClubId("home");
const AWAY = makeClubId("away");
const home = buildTeam(HOME, 11).setup;
const away = buildTeam(AWAY, 12).setup;
const SEED = 424242;
const attacking: MatchTactic = { ...home.tactic, team: { ...home.tactic.team, mentality: "attacking" } };

const played = simulateMatch({ seed: SEED, home, away });

/** The minute and half-time flag the renderer reads after `revealed` events have been shown. */
const revealedAt = (revealed: number) => {
  const shown = played.slice(0, revealed);
  const last = shown.at(-1);
  return {
    minute: last === undefined || last._tag === "MatchStarted" ? 0 : last.minute,
    halfTimeRevealed: shown.some((event) => event._tag === "HalfTimeReached"),
  };
};

/**
 * The sharpest command to give after `revealed` events: bring off the player the last revealed event
 * names, who then cannot appear in anything simulated after the command. Where that event names
 * nobody, a change of Team Instructions.
 */
const commandAfter = (revealed: number): MatchCommand => {
  const last = played[revealed - 1];
  return last !== undefined && "playerId" in last
    ? { _tag: "ForceOff", clubId: last.teamClubId, playerId: last.playerId }
    : { _tag: "ChangeTactics", clubId: HOME, tactic: attacking };
};

const replayWithCommandAt = (minute: number, command: MatchCommand): ReadonlyArray<MatchEvent> =>
  simulateMatch({ seed: SEED, home, away, commandsByMinute: new Map([[minute, [command]]]) });

describe("nextCommandMinute", () => {
  it("keeps every revealed event of a match exactly as shown, whenever the command is given", () => {
    for (let revealed = 1; revealed <= played.length; revealed++) {
      const { minute, halfTimeRevealed } = revealedAt(revealed);
      const replayed = replayWithCommandAt(nextCommandMinute(minute, halfTimeRevealed), commandAfter(revealed));
      expect(replayed.slice(0, revealed), `after ${revealed} revealed events`).toEqual(played.slice(0, revealed));
    }
  });

  it("is a real guarantee: stamping at the revealed minute itself rewrites something already shown", () => {
    const rewrites = Array.from({ length: played.length }, (_, index) => index + 1).filter((revealed) => {
      const { minute } = revealedAt(revealed);
      if (minute === 0) return false;
      const replayed = replayWithCommandAt(minute, commandAfter(revealed));
      return JSON.stringify(replayed.slice(0, revealed)) !== JSON.stringify(played.slice(0, revealed));
    });
    expect(rewrites.length).toBeGreaterThan(0);
  });

  it("takes effect at the next minute, moving to the second half once the first has nothing left", () => {
    expect(nextCommandMinute(0, false)).toBe(1);
    expect(nextCommandMinute(30, false)).toBe(31);
    expect(nextCommandMinute(45, false)).toBe(46);
    // First-half stoppage events carry minutes above 45 before half time is shown.
    expect(nextCommandMinute(47, false)).toBe(46);
    expect(nextCommandMinute(45, true)).toBe(46);
    expect(nextCommandMinute(60, true)).toBe(61);
  });
});