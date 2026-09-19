import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { MatchReportView } from "../src/index.js";

const wire = {
  matchId: "m1",
  homeClubId: "home",
  homeClubName: "Castlemere United",
  awayClubId: "away",
  awayClubName: "Northgate Athletic",
  homeScore: 2,
  awayScore: 1,
  halfTimeHomeScore: 1,
  halfTimeAwayScore: 0,
  events: [
    { minute: 12, half: 1, kind: "Goal", clubId: "home", playerId: "p1", playerName: "Ada Stone", replaced: null },
    {
      minute: 61,
      half: 2,
      kind: "Substitution",
      clubId: "away",
      playerId: "p9",
      playerName: "Cy Moss",
      replaced: { playerId: "p4", playerName: "Dee Hart", forcedByInjury: true },
    },
    {
      minute: 70,
      half: 2,
      kind: "GoalkeeperStandIn",
      clubId: "home",
      playerId: "p6",
      playerName: "Fay Lund",
      replaced: { playerId: "p7", playerName: "Gus Ward", forcedByInjury: false },
    },
  ],
  statistics: {
    matchId: "m1",
    homeClubName: "Castlemere United",
    awayClubName: "Northgate Athletic",
    throughMinute: null,
    rows: [{ key: "goals", home: 2, away: 1 }],
    unavailable: ["possession", "corners", "fouls", "offsides"],
  },
};

describe("Match Report (Screen 103)", () => {
  it("MatchReportView round-trips goals, a substitution, a goalkeeper stand-in and the embedded statistics", () => {
    expect(Schema.encodeSync(MatchReportView)(Schema.decodeUnknownSync(MatchReportView)(wire))).toEqual(wire);
  });

  it("rejects an event kind the report does not list", () => {
    const halfTime = { minute: 45, half: 1, kind: "HalfTimeReached", clubId: "home", playerId: "p1", playerName: "Ada Stone", replaced: null };
    expect(() => Schema.decodeUnknownSync(MatchReportView)({ ...wire, events: [halfTime] })).toThrow();
  });

  it("the RPC names an uncommitted match as its own failure", () => {
    expect(Schema.decodeUnknownSync(AppRpcs.getMatchReport.payload)({ saveId: "s1", matchId: "m1" })).toBeTruthy();
    expect(Schema.decodeUnknownSync(AppRpcs.getMatchReport.error)({ _tag: "MatchNotCompleteError", matchId: "m1" })).toBeTruthy();
  });
});
