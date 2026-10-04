/**
 * The Lineup Journal materialiser (ticket 04): a committed match stores its journal, so a post-match
 * read must rebuild the exact Lineup Frames the run produced from the kickoff shape and the journal
 * alone. These tests are the equivalence proof — materialised frames deep-equal the run's recorded
 * frames across seeds, commands and a goalkeeper stand-in — and pin the kickoff frame helper.
 */
import { describe, expect, it } from "vitest";
import type { PlayerId } from "@cm-clone/contracts";
import type { MatchCommand } from "../../src/match/commands.js";
import type { SubstitutionEvent } from "../../src/match/events.js";
import { simulateMatch, simulateMatchWithCounts } from "../../src/match/simulate/index.js";
import { kickoffFrameOf, materialiseFrames } from "../../src/match/simulate/materialiseFrames.js";
import { buildTeam, clubId as makeClubId, withNamedBench } from "./fixtures.js";

const HOME = makeClubId("home");
const AWAY = makeClubId("away");

describe("materialiseFrames", () => {
  it("reproduces the run's frames for uncommanded matches across seeds", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const home = buildTeam(HOME, seed).setup;
      const away = buildTeam(AWAY, seed + 1000).setup;
      const { events, frames, journal } = simulateMatchWithCounts({ seed, home, away });
      expect(materialiseFrames(kickoffFrameOf(home), journal, events.length)).toEqual(frames.get(HOME));
      expect(materialiseFrames(kickoffFrameOf(away), journal, events.length)).toEqual(frames.get(AWAY));
    }
  });

  it("reproduces the run's frames with a substitution, a bring-off and a goalkeeper stand-in", () => {
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
    const seed = findSeed((candidate) =>
      simulateMatchWithCounts({ seed: candidate, home, away, commandsByMinute })
        .journal.some((entry) => entry.kind === "standIn" && entry.origin === "manager"),
    );
    const { events, frames, journal } = simulateMatchWithCounts({ seed, home, away, commandsByMinute });
    expect(materialiseFrames(kickoffFrameOf(home), journal, events.length)).toEqual(frames.get(HOME));
    expect(materialiseFrames(kickoffFrameOf(away), journal, events.length)).toEqual(frames.get(AWAY));
  });

  it("reproduces the run's frames with a forced injury substitution", () => {
    const home = withNamedBench(buildTeam(HOME, 41).setup);
    const away = buildTeam(AWAY, 42).setup;
    const seed = findSeed((candidate) =>
      simulateMatch({ seed: candidate, home, away }).some(
        (event): event is SubstitutionEvent =>
          event._tag === "Substitution" && event.forcedByInjury && event.teamClubId === HOME,
      ),
    );
    const { events, frames, journal } = simulateMatchWithCounts({ seed, home, away });
    expect(materialiseFrames(kickoffFrameOf(home), journal, events.length)).toEqual(frames.get(HOME));
    expect(materialiseFrames(kickoffFrameOf(away), journal, events.length)).toEqual(frames.get(AWAY));
  });

  it("reads the kickoff frame from the setup alone, matching the run's first frame", () => {
    const home = buildTeam(HOME, 3).setup;
    const away = buildTeam(AWAY, 4).setup;
    const { frames } = simulateMatchWithCounts({ seed: 3, home, away });
    expect(kickoffFrameOf(home)).toEqual(frames.get(HOME)![0]);
    expect(kickoffFrameOf(away)).toEqual(frames.get(AWAY)![0]);
  });
});

/** The first seed in a bounded search satisfying `matches`, so a commanded test is not seed-pinned. */
const findSeed = (matches: (seed: number) => boolean): number => {
  for (let seed = 1; seed < 4000; seed++) if (matches(seed)) return seed;
  throw new Error("no seed found");
};
