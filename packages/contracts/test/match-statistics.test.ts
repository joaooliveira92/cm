import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { MatchPlayerStatsView, MatchStatisticsView } from "../src/index.js";

const wire = {
  matchId: "m1",
  homeClubName: "Castlemere United",
  awayClubName: "Northgate Athletic",
  throughMinute: null,
  rows: [
    { key: "goals", home: 2, away: 1 },
    { key: "attempts", home: 9, away: 6 },
  ],
  unavailable: ["possession"],
  homeAttackShare: null,
  awayAttackShare: null,
  chancesByType: null,
};

describe("Match Statistics (Screens 95/100)", () => {
  it("MatchStatisticsView round-trips a full-match view and a live cut", () => {
    for (const view of [wire, { ...wire, throughMinute: 63 }]) {
      expect(Schema.encodeSync(MatchStatisticsView)(Schema.decodeUnknownSync(MatchStatisticsView)(view))).toEqual(view);
    }
  });

  it("rejects a statistic the match model does not produce as a row", () => {
    expect(() =>
      Schema.decodeUnknownSync(MatchStatisticsView)({ ...wire, rows: [{ key: "passes", home: 55, away: 45 }] }),
    ).toThrow();
  });

  it("accepts the recorded-defending and possession rows", () => {
    const view = {
      ...wire,
      rows: [
        { key: "possession", home: 55, away: 45 },
        { key: "tacklesWon", home: 11, away: 8 },
        { key: "interceptions", home: 9, away: 10 },
        { key: "headersWon", home: 4, away: 6 },
      ],
      unavailable: [],
    };
    expect(Schema.encodeSync(MatchStatisticsView)(Schema.decodeUnknownSync(MatchStatisticsView)(view))).toEqual(view);
  });

  it("the RPC allows no match (none played yet) as a success", () => {
    expect(Schema.decodeSync(AppRpcs.getMatchStatistics.success)(null)).toBeNull();
    expect(Schema.decodeSync(AppRpcs.getMatchStatistics.payload)({ saveId: "s1", matchId: null, revealedEvents: null })).toBeTruthy();
  });
});

describe("Match Player Stats (map ticket 12)", () => {
  const row = (overrides: Record<string, unknown>) => ({
    playerId: "p1",
    playerName: "Alice Keeper",
    number: "1",
    captain: false,
    card: "none",
    started: true,
    played: true,
    cameOnMinute: null,
    wentOffMinute: null,
    keyPasses: 0,
    tacklesWon: null,
    tacklesAttempted: null,
    headers: null,
    headersWon: null,
    interceptions: null,
    runs: null,
    offsides: 0,
    fouls: 0,
    foulsSuffered: null,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    saves: 0,
    goals: 0,
    condition: null,
    rating: null,
    ...overrides,
  });

  const side = (rows: ReadonlyArray<Record<string, unknown>>) => ({
    clubId: "home",
    clubName: "Castlemere United",
    showSaves: true,
    rows,
  });

  const view = (rows: ReadonlyArray<Record<string, unknown>>) => ({
    matchId: "m1",
    homeClubName: "Castlemere United",
    awayClubName: "Northgate Athletic",
    throughMinute: null,
    home: side(rows),
    away: side(rows),
  });

  it("round-trips the recorded-defending columns, both null and populated", () => {
    const populated = row({ tacklesWon: 3, tacklesAttempted: 5, headers: 4, headersWon: 2, interceptions: 1, runs: 2, foulsSuffered: 1 });
    const wire = view([row({ playerId: "p2" }), populated]);
    expect(Schema.encodeSync(MatchPlayerStatsView)(Schema.decodeUnknownSync(MatchPlayerStatsView)(wire))).toEqual(wire);
  });
});
