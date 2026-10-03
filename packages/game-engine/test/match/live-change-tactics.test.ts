/**
 * A live `ChangeTactics` changes only the Team Instructions (group-g-match-day ticket 40,
 * decision request 01 Option A): it changes no slot, formation or bench, so who is on the pitch
 * stays owned by substitutions, red cards, injuries and bring-offs.
 */
import type { PlayerId } from "@cm-clone/contracts";
import { describe, expect, it } from "vitest";
import type { MatchCommand } from "../../src/match/commands.js";
import type { MatchEvent, RedCardEvent } from "../../src/match/events.js";
import { simulateMatch, simulateMatchWithCounts } from "../../src/match/simulate/index.js";
import { applyCommand, applyForcedOff, computeTeamStrengths, initTeamState, type TeamRuntimeState } from "../../src/match/simulate/teamState.js";
import { resolveTeamInstructions } from "../../src/match/simulate/tacticalAdapter.js";
import type { MatchTactic } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId, withNamedBench } from "./fixtures.js";

const HOME = makeClubId("home");
const AWAY = makeClubId("away");

const onPitch = (team: TeamRuntimeState): ReadonlyArray<PlayerId> => team.resolved.slots.map((slot) => slot.playerId);

const changeTactics = (team: TeamRuntimeState, tactic: MatchTactic, minute: number) =>
  applyCommand(team, { _tag: "ChangeTactics", clubId: HOME, tactic }, minute, minute > 45 ? 2 : 1, false);

const setup = withNamedBench(buildTeam(HOME, 7).setup);
const reserves = setup.tactic.bench.filter((id): id is PlayerId => id !== null);
const attacking: MatchTactic = { ...setup.tactic, team: { ...setup.tactic.team, mentality: "attacking" } };

describe("applyCommand's live ChangeTactics", () => {
  it("after a red card leaves the team with 10 and changes its Team Instructions", () => {
    const team = initTeamState(setup, 3);
    const sentOff = setup.tactic.slots[5]!.playerId;
    applyForcedOff(team, sentOff, 25, 1, []);
    const tenMen = onPitch(team);
    const attackBefore = computeTeamStrengths(team).modifiers.attack;

    // The command names the kickoff eleven, the sent-off player included.
    expect(changeTactics(team, attacking, 30)).toEqual({ accepted: true });

    expect(onPitch(team)).toEqual(tenMen);
    expect(onPitch(team)).not.toContain(sentOff);
    expect(team.resolved.instructions).toEqual(resolveTeamInstructions(attacking));
    expect(team.resolved.instructions).not.toEqual(resolveTeamInstructions(setup.tactic));
    expect(computeTeamStrengths(team).modifiers.attack).toBeGreaterThan(attackBefore);
  });

  it("naming a different XI changes no slot, and the substitutions the engine accepts follow the kickoff XI", () => {
    const team = initTeamState(setup, 3);
    const kickoff = onPitch(team);
    const starter = setup.tactic.slots[5]!.playerId;
    const redrafted: MatchTactic = {
      ...attacking,
      slots: setup.tactic.slots.map((slot, index) => (index === 5 ? { ...slot, playerId: reserves[0]! } : slot)),
      bench: [starter, ...reserves.slice(1), null],
    };

    expect(changeTactics(team, redrafted, 20)).toEqual({ accepted: true });

    expect(onPitch(team)).toEqual(kickoff);
    expect(team.bench).toEqual(setup.tactic.bench);
    // The redrafted Tactic's man is still on the bench and has never been on: he may come on, for
    // the kickoff starter the redraft had benched.
    expect(team.beenOn.has(reserves[0]!)).toBe(false);
    expect(applyCommand(team, { _tag: "MakeSubstitution", clubId: HOME, outPlayerId: starter, inPlayerId: reserves[0]! }, 25, 1, false)).toEqual({
      accepted: true,
    });
  });
});

describe("simulateMatch — seeded: a live ChangeTactics after a red card", () => {
  // Find a seed where the home side gets exactly one early red card and no other events
  // that change the home side (no injury, no substitution for home). The pipeline changed, so
  // previously-pinned seeds no longer produce the same shape.
  const findSeedWithEarlyRedCard = (): number | undefined => {
    for (let seed = 1; seed < 2000; seed++) {
      const home = withNamedBench(buildTeam(HOME, seed).setup);
      const away = withNamedBench(buildTeam(AWAY, seed + 1000).setup);
      const { events } = simulateMatchWithCounts({ seed, home, away });
      const redCards = events.filter((e): e is RedCardEvent => e._tag === "RedCard" && e.teamClubId === HOME);
      if (redCards.length === 1 && redCards[0]!.half === 1 && redCards[0]!.minute <= 20) {
        const homeChanges = events.filter(
          (e) => (e._tag === "Injury" || e._tag === "Substitution") && e.teamClubId === HOME,
        );
        if (homeChanges.length === 0) return seed;
      }
    }
    return undefined;
  };

  const pinnedSeed = findSeedWithEarlyRedCard() ?? 107;
  const home = withNamedBench(buildTeam(HOME, pinnedSeed).setup);
  const away = withNamedBench(buildTeam(AWAY, pinnedSeed + 1000).setup);
  const COMMAND_MINUTE = 60;
  const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([
    [COMMAND_MINUTE, [{ _tag: "ChangeTactics", clubId: HOME, tactic: { ...home.tactic, team: { ...home.tactic.team, mentality: "gungHo" } } }]],
  ]);
  const plain = simulateMatchWithCounts({ seed: pinnedSeed, home, away });
  const changed = simulateMatchWithCounts({ seed: pinnedSeed, home, away, commandsByMinute });
  const homeRed = (events: ReadonlyArray<MatchEvent>) =>
    events.filter((event): event is RedCardEvent => event._tag === "RedCard" && event.teamClubId === HOME);

  it("seed has its shape: one early home red card and no other home change", () => {
    const reds = homeRed(plain.events);
    expect(reds.length).toBe(1);
    expect(reds[0]!.half).toBe(1);
    expect(reds[0]!.minute).toBeLessThanOrEqual(20);
    expect(plain.events.some((event) => (event._tag === "Injury" || event._tag === "Substitution") && event.teamClubId === HOME)).toBe(false);
  });

  it("keeps the home side at 10 from the command to full time, with the sent-off player out of play", () => {
    const [red] = homeRed(changed.events);
    expect(red).toBeDefined();
    const sentOff = red!.playerId;

    const afterCommand = changed.counts.filter((entry) => entry.half === 2 && entry.minute >= COMMAND_MINUTE);
    expect(afterCommand.length).toBeGreaterThan(0);
    expect(afterCommand.every((entry) => entry.homeCount === 10)).toBe(true);
    const redIndex = changed.events.indexOf(red!);
    expect(changed.events.slice(redIndex + 1).some((event) => "playerId" in event && event.playerId === sentOff)).toBe(false);
  });

  it("changes the play after the command, and only after it", () => {
    const before = (events: ReadonlyArray<MatchEvent>) => {
      const COMMAND_MINUTE_LOCAL = COMMAND_MINUTE;
      const idx = events.findIndex((event) => {
        if (event._tag === "FullTimeWhistle") return true;
        if (event._tag === "MatchStarted") return false;
        return "half" in event && (event as { half: number; minute: number }).half === 2 && (event as { half: number; minute: number }).minute >= COMMAND_MINUTE_LOCAL;
      });
      return events.slice(0, Math.max(0, idx));
    };
    expect(before(changed.events)).toEqual(before(plain.events));
    expect(changed.events).not.toEqual(plain.events);
    expect(simulateMatch({ seed: pinnedSeed, home, away, commandsByMinute })).toEqual(changed.events);
  });
});