import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { MatchStatisticsView } from "../src/index.js";

const wire = {
  matchId: "m1",
  homeClubName: "Castlemere United",
  awayClubName: "Northgate Athletic",
  throughMinute: null,
  rows: [
    { key: "goals", home: 2, away: 1 },
    { key: "attempts", home: 9, away: 6 },
  ],
  unavailable: ["possession", "corners", "fouls", "offsides"],
};

describe("Match Statistics (Screens 95/100)", () => {
  it("MatchStatisticsView round-trips a full-match view and a live cut", () => {
    for (const view of [wire, { ...wire, throughMinute: 63 }]) {
      expect(Schema.encodeSync(MatchStatisticsView)(Schema.decodeUnknownSync(MatchStatisticsView)(view))).toEqual(view);
    }
  });

  it("rejects a statistic the match model does not produce as a row", () => {
    expect(() =>
      Schema.decodeUnknownSync(MatchStatisticsView)({ ...wire, rows: [{ key: "possession", home: 55, away: 45 }] }),
    ).toThrow();
  });

  it("the RPC allows no match (none played yet) as a success", () => {
    expect(Schema.decodeUnknownSync(AppRpcs.getMatchStatistics.success)(null)).toBeNull();
    expect(Schema.decodeUnknownSync(AppRpcs.getMatchStatistics.payload)({ saveId: "s1", matchId: null, revealedEvents: null })).toBeTruthy();
  });
});
