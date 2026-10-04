import { describe, expect, it } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import { countedSubstitutions, type MatchEvent } from "@cm-clone/game-engine";
import { aggregateMatchStatistics as aggregateWith, attackShare, matchPossession, matchRecordsInvolvement } from "../../../src/main/match/statistics.js";

/** The fold with the substitution count every read uses; this timeline has no goalkeeper stand-in. */
const aggregateMatchStatistics = (events: ReadonlyArray<MatchEvent>, homeClubId: ClubId, revealedEvents: number | null) =>
  aggregateWith(events, homeClubId, revealedEvents, countedSubstitutions(events, new Set(), revealedEvents));

const home = ClubId.make("home");
const away = ClubId.make("away");
const p = PlayerId.make("p");

const at = (minute: number, tag: string, teamClubId: ClubId, extra: Record<string, unknown> = {}) =>
  ({ _tag: tag, minute, half: minute <= 45 ? 1 : 2, teamClubId, playerId: p, ...extra }) as unknown as MatchEvent;

const goalEvent = (minute: number, teamClubId: ClubId, homeScore: number, awayScore: number) =>
  ({ _tag: "Goal", minute, half: minute <= 45 ? 1 : 2, teamClubId, playerId: p, homeScore, awayScore, chanceType: "throughBall", assistPlayerId: p }) as unknown as MatchEvent;

const shotOnTarget = (minute: number, teamClubId: ClubId) =>
  ({ _tag: "ShotOnTarget", minute, half: minute <= 45 ? 1 : 2, teamClubId, playerId: p, chanceType: "throughBall", assistPlayerId: p }) as unknown as MatchEvent;

const TIMELINE: ReadonlyArray<MatchEvent> = [
  { _tag: "MatchStarted", minute: 0, seed: 1, homeClubId: home, awayClubId: away } as unknown as MatchEvent,
  at(5, "ShotMissed", home),
  goalEvent(12, home, 1, 0),
  shotOnTarget(20, away),
  at(31, "ShotMissed", away),
  at(40, "YellowCard", away),
  { _tag: "HalfTimeReached", minute: 45, homeScore: 1, awayScore: 0 } as unknown as MatchEvent,
  at(50, "Injury", home, { trigger: "contact", severity: "light", tier: "orange", type: "deadLeg" }),
  { _tag: "Substitution", minute: 52, half: 2, teamClubId: home, outPlayerId: p, inPlayerId: p, forcedByInjury: true } as unknown as MatchEvent,
  goalEvent(77, away, 1, 1),
  at(88, "RedCard", home),
  { _tag: "FullTimeWhistle", minute: 90, homeScore: 1, awayScore: 1 } as unknown as MatchEvent,
];

const table = (rows: ReturnType<typeof aggregateMatchStatistics>) =>
  Object.fromEntries(rows.map((row) => [row.key, [row.home, row.away]]));

describe("aggregateMatchStatistics — team totals folded from the Match Events", () => {
  it("counts corners, free kicks and penalties for the side awarded them", () => {
    const setPieces: ReadonlyArray<MatchEvent> = [
      TIMELINE[0]!,
      at(10, "Corner", home, { deliveryType: "default", side: "left" }),
      at(11, "Corner", home, { deliveryType: "default", side: "right" }),
      at(30, "FreeKick", away, { side: "left" }),
      at(60, "Penalty", away),
    ];
    expect(table(aggregateMatchStatistics(setPieces, home, null))).toMatchObject({
      corners: [2, 0],
      freeKicks: [0, 1],
      penalties: [0, 1],
    });
  });

  it("counts every total for the side each event names", () => {
    expect(table(aggregateMatchStatistics(TIMELINE, home, null))).toEqual({
      goals: [1, 1],
      attempts: [2, 3],
      shotsOnTarget: [1, 2],
      shotsOffTarget: [1, 1],
      bigChances: [0, 0],
      fouls: [0, 0],
      offsides: [0, 0],
      corners: [0, 0],
      freeKicks: [0, 0],
      penalties: [0, 0],
      yellowCards: [0, 1],
      redCards: [1, 0],
      injuries: [1, 0],
      substitutions: [1, 0],
      tacklesWon: [0, 0],
      interceptions: [0, 0],
      headersWon: [0, 0],
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

describe("attackShare — each side's share of the chance-type events, never called possession", () => {
  const chance = (minute: number, tag: string, teamClubId: ClubId) => at(minute, tag, teamClubId);
  const attacks: ReadonlyArray<MatchEvent> = [
    TIMELINE[0]!,
    chance(3, "ThroughBall", home),
    chance(9, "Cross", home),
    chance(15, "Counter", away),
    chance(22, "LongShot", home),
  ];

  it("splits the chance-type events between the sides, as whole percentages", () => {
    expect(attackShare(attacks, home, null)).toEqual({ home: 75, away: 25 });
  });

  it("cuts a live match at the revealed position", () => {
    expect(attackShare(attacks, home, 3)).toEqual({ home: 100, away: 0 });
  });

  it("is null on both sides before the first attack, never 50-50", () => {
    expect(attackShare(attacks, home, 1)).toEqual({ home: null, away: null });
  });
});

describe("aggregateMatchStatistics — recorded defending totals", () => {
  it("counts a credited tackle, interception and header won for the side each event names", () => {
    const defending: ReadonlyArray<MatchEvent> = [
      TIMELINE[0]!,
      at(10, "Tackle", home),
      at(20, "Interception", home),
      at(30, "Tackle", away),
      { _tag: "HeaderDuel", minute: 40, half: 1, teamClubId: away, winnerId: p, loserId: p, attacking: false } as unknown as MatchEvent,
    ];
    expect(table(aggregateMatchStatistics(defending, home, null))).toMatchObject({
      tacklesWon: [1, 1],
      interceptions: [1, 0],
      headersWon: [0, 1],
    });
  });
});

describe("matchPossession — share of minute-slices, read from the last tally", () => {
  const tally = (minute: number, homeSlices: number, awaySlices: number): MatchEvent =>
    ({ _tag: "PossessionTally", minute, half: minute <= 45 ? 1 : 2, homeSlices, awaySlices }) as unknown as MatchEvent;

  it("returns whole percentages from the last tally at or before the revealed position", () => {
    const events: ReadonlyArray<MatchEvent> = [
      TIMELINE[0]!,
      tally(10, 6, 4),
      tally(45, 30, 15),
    ];
    expect(matchPossession(events, null)).toMatchObject({ key: "possession", home: 67, away: 33 });
    // Cut before the second tally: the first is the last one revealed.
    expect(matchPossession(events, 2)).toMatchObject({ key: "possession", home: 60, away: 40 });
  });

  it("is unavailable on a timeline with no tally, never 0 or 50", () => {
    expect(matchPossession(TIMELINE, null)).toBeNull();
  });
});

describe("matchRecordsInvolvement — the marker for a timeline written before the new events", () => {
  it("is true once a possession tally is revealed, false before it and on a pre-change timeline", () => {
    const withTally: ReadonlyArray<MatchEvent> = [
      TIMELINE[0]!,
      at(10, "PossessionTally", home, { homeSlices: 6, awaySlices: 4 }),
    ];
    expect(matchRecordsInvolvement(withTally, null)).toBe(true);
    expect(matchRecordsInvolvement(withTally, 1)).toBe(false);
    expect(matchRecordsInvolvement(TIMELINE, null)).toBe(false);
  });
});
