/**
 * The substitution projection: `substitutionStatus` reads the engine's recorded Lineup Frames and
 * Lineup Journal, not a re-enacted window rule (ticket 03). The constructed-frame tables pin the
 * projection's arithmetic — a manager substitution counts once given, two in a minute share a
 * window, a halftime instruction opens none, a stand-in spends nothing, a forced change counts only
 * once revealed; the seeded tables pin what the engine records (each substitution's role and
 * `openedWindow`, and the counters the frames carry) against a real run.
 */
import { describe, expect, it } from "vitest";
import type { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchCommand } from "../../src/match/commands.js";
import type { MatchEvent } from "../../src/match/events.js";
import type {
  LineupJournalEntry,
  LineupSubstitutionRole,
  RuntimeFrame,
} from "../../src/match/simulate/lineupRecording.js";
import { simulateMatchWithCounts } from "../../src/match/simulate/index.js";
import { substitutionStatus, countedSubstitutions, substitutionLedger } from "../../src/match/substitutions.js";
import { buildTeam, clubId as makeClubId, withNamedBench } from "./fixtures.js";

const club = makeClubId("me");
const player = (id: string): PlayerId => id as PlayerId;

/** A frame with the given spent counters, everything else empty: the projection reads only these. */
const frame = (substitutionsUsed = 0, windowsUsed = 0): RuntimeFrame => ({
  clubId: club,
  slots: [],
  beenOn: new Set(),
  substitutes: [],
  substitutionsUsed,
  windowsUsed,
});

/** A manager substitution journal entry; `openedWindow` is the recorded window-step fact. */
const subEntry = (
  appliesAt: number,
  out: string,
  on: string,
  openedWindow: boolean,
  role: LineupSubstitutionRole = "manager",
): LineupJournalEntry => ({
  appliesAt,
  clubId: club,
  kind: "substitution",
  origin: "manager",
  outPlayerId: player(out),
  inPlayerId: player(on),
  role,
  openedWindow,
});

const statusAt = (
  frames: ReadonlyArray<RuntimeFrame>,
  journal: ReadonlyArray<LineupJournalEntry>,
  revealedEvents: number | null,
) => substitutionStatus(club, frames, journal, revealedEvents);

describe("substitutionStatus projects the recorded counters", () => {
  it("counts a manager substitution once given, ahead of its reveal", () => {
    // The engine records the window-opening substitution from event index 4 onward.
    const frames = [frame(), frame(), frame(), frame(), frame(1, 1)];
    const journal = [subEntry(4, "a", "x", true)];

    // Before the reveal the frame is still at kickoff, but the manager's own change already counts.
    expect(statusAt(frames, journal, 2)).toMatchObject({ used: 1, windowsUsed: 1 });
    expect(statusAt(frames, journal, 4)).toMatchObject({ used: 1, windowsUsed: 1 });
    expect(statusAt(frames, journal, null)).toMatchObject({ used: 1, windowsUsed: 1 });
  });

  it("shares one window between two substitutions in the same minute", () => {
    // The second is recorded with openedWindow false: the engine's window step saw the first.
    const frames = [frame(), frame(), frame(1, 1), frame(2, 1)];
    const journal = [subEntry(2, "a", "x", true), subEntry(3, "b", "y", false)];

    expect(statusAt(frames, journal, null)).toMatchObject({ used: 2, windowsUsed: 1 });
    // Even before either is revealed, both manager changes count and share the one window.
    expect(statusAt(frames, journal, 1)).toMatchObject({ used: 2, windowsUsed: 1 });
  });

  it("counts a halftime instruction as a substitution that opens no window", () => {
    const frames = [frame(), frame(1, 0)];
    const journal = [subEntry(1, "a", "x", false, "halftime")];
    expect(statusAt(frames, journal, 1)).toMatchObject({ used: 1, windowsUsed: 0 });
  });

  it("counts a goalkeeper stand-in for nothing", () => {
    const frames = [frame(), frame()];
    const journal: ReadonlyArray<LineupJournalEntry> = [
      { appliesAt: 1, clubId: club, kind: "standIn", origin: "forced", outPlayerId: player("gk"), inPlayerId: player("s1"), role: "standIn" },
    ];
    expect(statusAt(frames, journal, null)).toMatchObject({ used: 0, windowsUsed: 0 });
  });

  it("counts a forced substitution only once its event is revealed", () => {
    const frames = [frame(), frame(), frame(1, 1)];
    const journal: ReadonlyArray<LineupJournalEntry> = [
      { appliesAt: 2, clubId: club, kind: "substitution", origin: "forced", outPlayerId: player("p"), inPlayerId: player("b"), openedWindow: true },
    ];
    // The frame carries it from index 2; no overlay applies to a forced change.
    expect(statusAt(frames, journal, 1)).toMatchObject({ used: 0, windowsUsed: 0 });
    expect(statusAt(frames, journal, 2)).toMatchObject({ used: 1, windowsUsed: 1 });
  });

  it("reads the cap from the recorded windows", () => {
    const frames = [frame(5, 3)];
    expect(statusAt(frames, [], null)).toMatchObject({ used: 5, remaining: 0, windowsUsed: 3, windowsRemaining: 0, capReached: true });
  });
});

const HOME = makeClubId("home");
const AWAY = makeClubId("away");

/** A scheduled manager command: the minute the engine applies it at, and the command itself. */
interface Scheduled {
  readonly minute: number;
  readonly isHalftime: boolean;
  readonly command: MatchCommand;
}

const kickoff = (seed: number) => {
  const home = withNamedBench(buildTeam(HOME, seed).setup);
  const away = withNamedBench(buildTeam(AWAY, seed + 500).setup);
  const bench = home.tactic.bench.filter((id): id is PlayerId => id !== null);
  return { home, away, bench };
};

const play = (seed: number, home: ReturnType<typeof kickoff>["home"], away: ReturnType<typeof kickoff>["away"], scheduled: ReadonlyArray<Scheduled>) => {
  const commandsByMinute = new Map<number, Array<MatchCommand>>();
  const halftimeCommands: Array<MatchCommand> = [];
  for (const entry of scheduled) {
    if (entry.isHalftime) halftimeCommands.push(entry.command);
    else {
      const existing = commandsByMinute.get(entry.minute);
      if (existing) existing.push(entry.command);
      else commandsByMinute.set(entry.minute, [entry.command]);
    }
  }
  return simulateMatchWithCounts({ seed, home, away, commandsByMinute, halftimeCommands });
};

const managerSubs = (journal: ReadonlyArray<LineupJournalEntry>, clubId: ClubId) =>
  journal.filter((entry) => entry.kind === "substitution" && entry.origin === "manager" && entry.clubId === clubId);

describe("the engine records the substitution facts the projection reads", () => {
  it("records a manager substitution with role manager and a window opened", () => {
    const { home, away, bench } = kickoff(11);
    const out = home.tactic.slots[3]!.playerId;
    const { frames, journal } = play(1, home, away, [
      { minute: 1, isHalftime: false, command: { _tag: "MakeSubstitution", clubId: HOME, outPlayerId: out, inPlayerId: bench[0]! } },
    ]);

    expect(managerSubs(journal, HOME)).toMatchObject([{ role: "manager", openedWindow: true }]);
    expect(substitutionStatus(HOME, frames.get(HOME)!, journal, null)).toMatchObject({ used: 1, windowsUsed: 1 });
  });

  it("records two substitutions in one minute: the first opens the window, the second shares it", () => {
    const { home, away, bench } = kickoff(21);
    const { frames, journal } = play(1, home, away, [
      { minute: 2, isHalftime: false, command: { _tag: "MakeSubstitution", clubId: HOME, outPlayerId: home.tactic.slots[4]!.playerId, inPlayerId: bench[0]! } },
      { minute: 2, isHalftime: false, command: { _tag: "MakeSubstitution", clubId: HOME, outPlayerId: home.tactic.slots[5]!.playerId, inPlayerId: bench[1]! } },
    ]);

    expect(managerSubs(journal, HOME).map((entry) => entry.openedWindow)).toEqual([true, false]);
    expect(substitutionStatus(HOME, frames.get(HOME)!, journal, null)).toMatchObject({ used: 2, windowsUsed: 1 });
  });

  it("records a halftime instruction with role halftime and no window", () => {
    const { home, away, bench } = kickoff(31);
    const { frames, journal } = play(1, home, away, [
      { minute: 45, isHalftime: true, command: { _tag: "MakeSubstitution", clubId: HOME, outPlayerId: home.tactic.slots[6]!.playerId, inPlayerId: bench[0]! } },
    ]);

    expect(managerSubs(journal, HOME)).toMatchObject([{ role: "halftime", openedWindow: false }]);
    expect(substitutionStatus(HOME, frames.get(HOME)!, journal, null)).toMatchObject({ used: 1, windowsUsed: 0 });
  });

  it("records a bring-off of the last goalkeeper as a stand-in that spends nothing", () => {
    const { home, away } = kickoff(41);
    const keeper = home.tactic.slots[0]!.playerId;
    const { frames, journal } = play(1, home, away, [
      { minute: 1, isHalftime: false, command: { _tag: "ForceOff", clubId: HOME, playerId: keeper } },
    ]);

    const standIn = journal.find((entry) => entry.kind === "standIn" && entry.origin === "manager");
    expect(standIn).toMatchObject({ role: "standIn", outPlayerId: keeper });
    expect(standIn!.inPlayerId).toBeDefined();
    expect(substitutionStatus(HOME, frames.get(HOME)!, journal, null)).toMatchObject({ used: 0, windowsUsed: 0 });
    // The stand-in is the goalkeeper from the frame after the forced Substitution.
    const last = frames.get(HOME)!.at(-1)!;
    expect(last.slots.find((slot) => slot.isGoalkeeper)?.playerId).toBe(standIn!.inPlayerId);
  });

  it("records a refused bring-off with forceOffApplied false and no lineup change", () => {
    const { home, away } = kickoff(51);
    const notOnHome = away.tactic.slots[7]!.playerId;
    const kickoffSlots = home.tactic.slots.map((slot) => slot.playerId);
    const { frames, journal } = play(1, home, away, [
      { minute: 1, isHalftime: false, command: { _tag: "ForceOff", clubId: HOME, playerId: notOnHome } },
    ]);

    expect(journal.find((entry) => entry.kind === "forceOff" && entry.origin === "manager")).toMatchObject({
      playerId: notOnHome,
      forceOffApplied: false,
    });
    expect(substitutionStatus(HOME, frames.get(HOME)!, journal, null)).toMatchObject({ used: 0, windowsUsed: 0 });
    for (const entry of frames.get(HOME)!) expect(entry.slots.map((slot) => slot.playerId)).toEqual(kickoffSlots);
  });
});

/**
 * The statistics count (`countedSubstitutions`, event-indexed) and the substitution panel's `used`
 * (`substitutionStatus`, frame-indexed) encode the same forced-reveal law twice. This cross-check
 * pins them equal across seeds, commands and cuts, so a drift between the two encodings fails a gate
 * even though the statistics read keeps its event-based filter.
 */
describe("countedSubstitutions agrees with substitutionStatus", () => {
  const cutsFor = (eventCount: number): ReadonlyArray<number | null> => [
    null,
    0,
    1,
    Math.floor(eventCount / 2),
    Math.max(0, eventCount - 1),
    eventCount,
  ];

  const expectAgreement = (
    seed: number,
    events: ReadonlyArray<MatchEvent>,
    frames: ReadonlyMap<ClubId, ReadonlyArray<RuntimeFrame>>,
    journal: ReadonlyArray<LineupJournalEntry>,
  ): void => {
    const { standIns } = substitutionLedger([], events, journal);
    for (const clubId of [HOME, AWAY]) {
      for (const cut of cutsFor(events.length)) {
        const counted = countedSubstitutions(events, standIns, cut).filter(
          (event) => event.teamClubId === clubId,
        ).length;
        const status = substitutionStatus(clubId, frames.get(clubId)!, journal, cut).used;
        expect(counted, `seed ${seed}, ${clubId}, cut ${cut}`).toBe(status);
      }
    }
  };

  it("for uncommanded seeds, covering forced injuries and stand-ins", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { home, away } = kickoff(seed);
      const { events, frames, journal } = play(seed, home, away, []);
      expectAgreement(seed, events, frames, journal);
    }
  });

  it("with a manager substitution and a bring-off", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { home, away, bench } = kickoff(seed);
      const { events, frames, journal } = play(seed, home, away, [
        {
          minute: 2,
          isHalftime: false,
          command: { _tag: "MakeSubstitution", clubId: HOME, outPlayerId: home.tactic.slots[3]!.playerId, inPlayerId: bench[0]! },
        },
        {
          minute: 60,
          isHalftime: false,
          command: { _tag: "ForceOff", clubId: HOME, playerId: home.tactic.slots[5]!.playerId },
        },
      ]);
      expectAgreement(seed, events, frames, journal);
    }
  });
});
