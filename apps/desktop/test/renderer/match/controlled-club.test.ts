import { describe, expect, it } from "vitest";
import { ClubId, FixtureId, MatchId, MatchSummary } from "@cm-clone/contracts";
import { controlledClubId, controlledOnPitchCount, controlledSubs } from "../../../src/renderer/match/controlledClub.js";

const summary = (isHome: boolean) =>
  new MatchSummary({
    matchId: MatchId.make("m1"),
    fixtureId: FixtureId.make(1),
    homeClubId: ClubId.make("home"),
    homeClubName: "Home FC",
    awayClubId: ClubId.make("away"),
    awayClubName: "Away FC",
    isHome,
  });

const subs = (used: number) => ({ used, remaining: 5 - used, windowsUsed: used, windowsRemaining: 3 - used, capReached: false });

const response = { homeSubs: subs(1), awaySubs: subs(2), homeOnPitchCount: 11, awayOnPitchCount: 10 } as never;

describe("the controlled club's side of a match (ticket 12)", () => {
  it("is the home side at home", () => {
    expect(controlledClubId(summary(true))).toBe("home");
    expect(controlledSubs(summary(true), response).used).toBe(1);
    expect(controlledOnPitchCount(summary(true), response)).toBe(11);
  });

  it("is the away side away", () => {
    expect(controlledClubId(summary(false))).toBe("away");
    expect(controlledSubs(summary(false), response).used).toBe(2);
    expect(controlledOnPitchCount(summary(false), response)).toBe(10);
  });
});
