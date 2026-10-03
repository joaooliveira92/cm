import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { MatchOverviewView } from "../src/index.js";

const wire = {
  matchId: "m1",
  homeClubName: "Castlemere United",
  awayClubName: "Northgate Athletic",
  home: {
    scorers: [{ playerId: "p1", playerName: "Isaac Okoronkwo", goals: [{ minute: 45, half: 1, penalty: true }, { minute: 57, half: 2, penalty: false }] }],
    sendOffs: [],
  },
  away: {
    scorers: [{ playerId: "p2", playerName: "Bob Striker", goals: [{ minute: 80, half: 2, penalty: false }] }],
    sendOffs: [{ playerId: "p3", playerName: "Carl Defender", minute: 63, half: 2 }],
  },
  halfTimeHomeScore: 1,
  halfTimeAwayScore: 0,
  fixture: { competitionName: "League", round: 12, gameDate: "2026-08-01", venue: "Park, Town" },
};

describe("Match Overview (map ticket 15)", () => {
  it("MatchOverviewView round-trips a full and a pre-half-time view", () => {
    for (const view of [wire, { ...wire, halfTimeHomeScore: null, halfTimeAwayScore: null }]) {
      expect(Schema.encodeSync(MatchOverviewView)(Schema.decodeUnknownSync(MatchOverviewView)(view))).toEqual(view);
    }
  });

  it("rejects a half that is not a first or second half", () => {
    expect(() =>
      Schema.decodeUnknownSync(MatchOverviewView)({ ...wire, home: { ...wire.home, scorers: [{ ...wire.home.scorers[0], goals: [{ minute: 12, half: 3, penalty: false }] }] } }),
    ).toThrow();
  });

  it("the RPC allows no match (none played yet) as a success and the view as itself", () => {
    expect(Schema.decodeSync(AppRpcs.getMatchOverview.success)(null)).toBeNull();
    expect(Schema.decodeUnknownSync(AppRpcs.getMatchOverview.success)(wire)).toBeInstanceOf(MatchOverviewView);
    expect(
      Schema.decodeSync(AppRpcs.getMatchOverview.payload)({ saveId: "s1", matchId: null, revealedEvents: null }),
    ).toBeTruthy();
  });
});
