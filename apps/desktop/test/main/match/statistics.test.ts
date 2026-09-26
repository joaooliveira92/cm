import { describe, expect, it } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchEvent } from "@cm-clone/game-engine";
import { aggregateMatchStatistics as aggregateWith } from "../../../src/main/match/statistics.js";
import { countedSubstitutions } from "../../../src/main/match/substitutions.js";

/** The fold with the substitution count every read uses; this timeline has no goalkeeper stand-in. */
const aggregateMatchStatistics = (events: ReadonlyArray<MatchEvent>, homeClubId: ClubId, revealedEvents: number | null) =>
  aggregateWith(events, homeClubId, revealedEvents, countedSubstitutions(events, new Set(), revealedEvents));

const home = ClubId.make("home");
const away = ClubId.make("away");
const p = PlayerId.make("p");

const at = (minute: number, tag: string, teamClubId: ClubId, extra: Record<string, unknown> = {}) =>
  ({ _tag: tag, minute, half: minute <= 45 ? 1 : 2, teamClubId, playerId: p, ...extra }) as unknown as MatchEvent;

const TIMELINE: ReadonlyArray<MatchEvent> = [
  { _tag: "MatchStarted", minute: 0, seed: 1, homeClubId: home, awayClubId: away } as unknown as MatchEvent,
  at(5, "ShotMissed", home),
  at(12, "Goal", home, { homeScore: 1, awayScore: 0 }),
  at(20, "ShotOnTarget", away),
  at(31, "BigChance", away),
  at(40, "YellowCard", away),
  { _tag: "HalfTimeReached", minute: 45, homeScore: 1, awayScore: 0 } as unknown as MatchEvent,
  at(50, "Injury", home, { trigger: "contact", severity: "light", tier: "orange", type: "deadLeg" }),
  { _tag: "Substitution", minute: 52, half: 2, teamClubId: home, outPlayerId: p, inPlayerId: p, forcedByInjury: true } as unknown as MatchEvent,
  at(77, "Goal", away, { homeScore: 1, awayScore: 1 }),
  at(88, "RedCard", home),
  { _tag: "FullTimeWhistle", minute: 90, homeScore: 1, awayScore: 1 } as unknown as MatchEvent,
];

const table = (rows: ReturnType<typeof aggregateMatchStatistics>) =>
  Object.fromEntries(rows.map((row) => [row.key, [row.home, row.away]]));

describe("aggregateMatchStatistics — team totals folded from the Match Events", () => {
  it("counts every total for the side each event names", () => {
    expect(table(aggregateMatchStatistics(TIMELINE, home, null))).toEqual({
      goals: [1, 1],
      attempts: [2, 3],
      shotsOnTarget: [1, 2],
      shotsOffTarget: [1, 0],
      bigChances: [0, 1],
      yellowCards: [0, 1],
      redCards: [1, 0],
      injuries: [1, 0],
      substitutions: [1, 0],
    });
  });

  it("cuts a live match after the revealed events, by position in the timeline", () => {
    // MatchStarted, ShotMissed, Goal, ShotOnTarget revealed.
    expect(table(aggregateMatchStatistics(TIMELINE, home, 4))).toMatchObject({
      goals: [1, 0],
      attempts: [2, 1],
      shotsOnTarget: [1, 1],
      yellowCards: [0, 0],
    });
  });

  it("does not trust minutes: first-half stoppage runs past 45 and the second half restarts at 46", () => {
    const stoppage: ReadonlyArray<MatchEvent> = [
      TIMELINE[0]!,
      at(47, "Goal", home, { homeScore: 1, awayScore: 0 }),
      { _tag: "HalfTimeReached", minute: 45, homeScore: 1, awayScore: 0 } as unknown as MatchEvent,
      at(46, "Goal", away, { homeScore: 1, awayScore: 1 }),
      at(46, "YellowCard", home),
    ];
    // Up to the stoppage-time goal: the second-half goal at 46 is not yet revealed.
    expect(table(aggregateMatchStatistics(stoppage, home, 2)).goals).toEqual([1, 0]);
    // After half time: the stoppage-time goal at 47 is still counted.
    expect(table(aggregateMatchStatistics(stoppage, home, 3)).goals).toEqual([1, 0]);
    // Two events on minute 46, only the first revealed: the card is not counted yet.
    expect(table(aggregateMatchStatistics(stoppage, home, 4))).toMatchObject({ goals: [1, 1], yellowCards: [0, 0] });
  });

  it("reconciles: attempts are exactly on target + off target + big chances, and goals match the final score", () => {
    const rows = table(aggregateMatchStatistics(TIMELINE, home, null));
    for (const side of [0, 1]) {
      expect(rows.attempts![side]).toBe(rows.shotsOnTarget![side]! + rows.shotsOffTarget![side]! + rows.bigChances![side]!);
    }
    expect(rows.goals).toEqual([1, 1]);
  });

  it("is all zeros before kick-off", () => {
    expect(aggregateMatchStatistics(TIMELINE.slice(0, 1), home, null).every((row) => row.home === 0 && row.away === 0)).toBe(true);
  });
});
