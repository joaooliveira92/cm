/**
 * The engine records the lineup as it runs (ticket 01). The primary seam is the engine run: for
 * seeds with and without commands, the recorded Lineup Frames are a consistent, monotonic record of
 * who was on and what the engine spent, and the Lineup Journal carries each change's event index,
 * club, kind, players, origin, role and force-off-applied fact. Recording draws no random numbers,
 * so `simulateMatch`'s timeline is unchanged.
 */
import { describe, expect, it } from "vitest";
import type { PlayerId } from "@cm-clone/contracts";
import type { MatchCommand } from "../../src/match/commands.js";
import type { MatchEvent, SubstitutionEvent } from "../../src/match/events.js";
import {
  simulateMatch,
  simulateMatchWithCondition,
  simulateMatchWithCounts,
} from "../../src/match/simulate/index.js";
import type { RuntimeFrame } from "../../src/match/simulate/lineupRecording.js";
import type { MatchTeamSetup } from "../../src/match/types.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents } from "../../src/match/stream.js";
import { buildTeam, clubId as makeClubId, withNamedBench } from "./fixtures.js";

const HOME = makeClubId("home");
const AWAY = makeClubId("away");

/**
 * The recorded-frame invariants, without an oracle: one frame per event plus the final, the kickoff
 * frame at the kickoff shape, distinct players in every frame's slots, and the substitution and
 * window counts only ever rising. `commands` is gone: the frames are the record now.
 */
const expectFramesConsistent = (
  setup: MatchTeamSetup,
  events: ReadonlyArray<MatchEvent>,
  frames: ReadonlyArray<RuntimeFrame>,
): void => {
  expect(frames).toHaveLength(events.length + 1);
  expect(frames[0]!.slots.map((slot) => slot.playerId)).toEqual(setup.tactic.slots.map((slot) => slot.playerId));
  let substitutionsUsed = 0;
  let windowsUsed = 0;
  for (const frame of frames) {
    const ids = frame.slots.map((slot) => slot.playerId);
    expect(new Set(ids).size, `frame slots are distinct: ${ids.join(",")}`).toBe(ids.length);
    expect(frame.substitutionsUsed).toBeGreaterThanOrEqual(substitutionsUsed);
    expect(frame.windowsUsed).toBeGreaterThanOrEqual(windowsUsed);
    substitutionsUsed = frame.substitutionsUsed;
    windowsUsed = frame.windowsUsed;
  }
};

describe("Lineup Frames match the event-derived pitch", () => {
  it("for uncommanded matches across a spread of seeds", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const home = buildTeam(HOME, seed).setup;
      const away = buildTeam(AWAY, seed + 1000).setup;
      const { events, frames } = simulateMatchWithCounts({ seed, home, away });
      expectFramesConsistent(home, events, frames.get(HOME)!);
      expectFramesConsistent(away, events, frames.get(AWAY)!);
    }
  });

  it("for a commanded match with a substitution, a bring-off and a goalkeeper stand-in", () => {
    const home = withNamedBench(buildTeam(HOME, 11).setup);
    const away = withNamedBench(buildTeam(AWAY, 12).setup);
    const substituteOut = home.tactic.slots[3]!.playerId;
    const substituteIn = home.tactic.bench.find((id): id is PlayerId => id !== null)!;
    const broughtOff = home.tactic.slots[5]!.playerId;
    const keeper = home.tactic.slots[0]!.playerId;
    // All at minute 1, so no earlier play can have removed a player and refused a command.
    const commands: ReadonlyArray<MatchCommand> = [
      { _tag: "MakeSubstitution", clubId: HOME, outPlayerId: substituteOut, inPlayerId: substituteIn },
      { _tag: "ForceOff", clubId: HOME, playerId: broughtOff },
      { _tag: "ForceOff", clubId: HOME, playerId: keeper },
    ];
    const commandsByMinute = new Map<number, ReadonlyArray<MatchCommand>>([[1, commands]]);

    // A seed where the injury/foul draw does not otherwise disturb the lineup in minute 1.
    const seed = findSeed((candidate) =>
      simulateMatchWithCounts({ seed: candidate, home, away, commandsByMinute })
        .journal.some((entry) => entry.kind === "standIn" && entry.origin === "manager"),
    );

    const { events, frames, journal } = simulateMatchWithCounts({ seed, home, away, commandsByMinute });
    expectFramesConsistent(home, events, frames.get(HOME)!);
    expectFramesConsistent(away, events, frames.get(AWAY)!);

    const substitution = journal.find((entry) => entry.kind === "substitution" && entry.origin === "manager");
    expect(substitution).toMatchObject({
      clubId: HOME,
      kind: "substitution",
      origin: "manager",
      outPlayerId: substituteOut,
      inPlayerId: substituteIn,
      role: "manager",
    });
    // The frame at the Substitution's own event still holds the player coming off.
    const subIndex = events.findIndex(
      (event): event is SubstitutionEvent =>
        event._tag === "Substitution" && !event.forcedByInjury && event.outPlayerId === substituteOut,
    );
    expect(subIndex).toBeGreaterThan(-1);
    expect(substitution!.appliesAt).toBe(subIndex + 1);
    expect(frames.get(HOME)![subIndex]!.slots.map((slot) => slot.playerId)).toContain(substituteOut);
    expect(frames.get(HOME)![subIndex]!.slots.map((slot) => slot.playerId)).not.toContain(substituteIn);

    const standIn = journal.find((entry) => entry.kind === "standIn" && entry.origin === "manager");
    expect(standIn).toMatchObject({ clubId: HOME, kind: "standIn", origin: "manager", outPlayerId: keeper, role: "standIn", forceOffApplied: true });
    // The stand-in spends nothing and is the goalkeeper from the frame after its event.
    const standInIndex = events.findIndex(
      (event): event is SubstitutionEvent => event._tag === "Substitution" && event.forcedByInjury,
    );
    expect(standInIndex).toBeGreaterThan(-1);
    expect(frames.get(HOME)![standInIndex + 1]!.slots.find((slot) => slot.isGoalkeeper)!.playerId).toBe(standIn!.inPlayerId);
    expect(frames.get(HOME)!.at(-1)!.substitutionsUsed).toBe(1);
  });

  it("for a match with a forced injury substitution", () => {
    const home = withNamedBench(buildTeam(HOME, 41).setup);
    const away = buildTeam(AWAY, 42).setup;
    const seed = findSeed((candidate) =>
      simulateMatch({ seed: candidate, home, away }).some(
        (event): event is SubstitutionEvent =>
          event._tag === "Substitution" && event.forcedByInjury && event.teamClubId === HOME,
      ),
    );
    const { events, frames, journal } = simulateMatchWithCounts({ seed, home, away });
    expectFramesConsistent(home, events, frames.get(HOME)!);
    const forced = journal.find((entry) => entry.kind === "substitution" && entry.origin === "forced");
    expect(forced).toMatchObject({ clubId: HOME, kind: "substitution", origin: "forced" });
    expect(forced!.inPlayerId).toBeDefined();
  });

  it("journals a refused bring-off with forceOffApplied false and no lineup change", () => {
    const home = withNamedBench(buildTeam(HOME, 21).setup);
    const away = buildTeam(AWAY, 22).setup;
    // `away`'s player is not on `home`, so the engine refuses it and records nothing.
    const notOnHome = away.tactic.slots[7]!.playerId;
    const { frames, journal } = simulateMatchWithCounts({
      seed: 7,
      home,
      away,
      commandsByMinute: new Map([[1, [{ _tag: "ForceOff", clubId: HOME, playerId: notOnHome }]]]),
    });
    const refused = journal.find((entry) => entry.kind === "forceOff" && entry.origin === "manager");
    expect(refused).toMatchObject({ clubId: HOME, kind: "forceOff", origin: "manager", playerId: notOnHome, forceOffApplied: false });
    expect(frames.get(HOME)![0]!.slots.map((slot) => slot.playerId)).toEqual(
      frames.get(HOME)!.at(-1)!.slots.map((slot) => slot.playerId),
    );
  });
});

describe("recording does not change play", () => {
  it("leaves simulateMatch's timeline byte-identical to the recording wrappers", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const home = buildTeam(HOME, seed).setup;
      const away = buildTeam(AWAY, seed + 500).setup;
      const input = { seed, home, away };
      const plain = simulateMatch(input);
      expect(simulateMatchWithCounts(input).events).toEqual(plain);
      expect(simulateMatchWithCondition(input).events).toEqual(plain);
    }
  });

  it("returns one frame per event plus a final frame, and the kickoff lineup first", () => {
    const home = buildTeam(HOME, 3).setup;
    const away = buildTeam(AWAY, 4).setup;
    const { events, frames } = simulateMatchWithCounts({ seed: 3, home, away });
    const homeFrames = frames.get(HOME)!;
    expect(homeFrames).toHaveLength(events.length + 1);
    expect(homeFrames[0]!.slots.map((slot) => slot.playerId)).toEqual(home.tactic.slots.map((slot) => slot.playerId));
    expect(homeFrames[0]!.slots.filter((slot) => slot.isGoalkeeper)).toHaveLength(1);
  });
});

describe("deriveMatchEvents threads the recording through", () => {
  it("returns frames and a journal beside events, conditions and counts", () => {
    const home = withNamedBench(buildTeam(HOME, 31).setup);
    const away = buildTeam(AWAY, 32).setup;
    const outPlayerId = home.tactic.slots[4]!.playerId;
    const inPlayerId = home.tactic.bench.find((id): id is PlayerId => id !== null)!;
    const stream = [
      {
        seq: 1,
        tag: MATCH_STREAM_TYPE,
        payload: { seed: 31, homeClubId: HOME, awayClubId: AWAY, homeSetup: home, awaySetup: away, pillars: {}, homeRegimen: 3, awayRegimen: 3 },
      },
      { seq: 2, tag: "SubstitutionMade", payload: { _tag: "SubstitutionMade", minute: 1, isHalftime: false, clubId: HOME, outPlayerId, inPlayerId } },
    ];
    const derived = deriveMatchEvents(stream);
    expect(derived.frames.size).toBe(2);
    expect(derived.frames.get(HOME)).toHaveLength(derived.events.length + 1);
    expect(derived.journal.some((entry) => entry.kind === "substitution" && entry.origin === "manager")).toBe(true);
    expect(derived.frames.get(HOME)![0]!.clubId).toBe(HOME);
  });
});

/** The first seed in a bounded search satisfying `matches`, so a commanded test is not seed-pinned. */
const findSeed = (matches: (seed: number) => boolean): number => {
  for (let seed = 1; seed < 4000; seed++) if (matches(seed)) return seed;
  throw new Error("no seed found");
};
