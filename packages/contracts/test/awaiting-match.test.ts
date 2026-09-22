import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { MatchSummary } from "../src/index.js";

/** group-g-match-day 37: the read Match day resumes a started match through after an app restart. */
const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  expect(Schema.encodeSync(schema)(Schema.decodeUnknownSync(schema)(wire))).toEqual(wire);
};

describe("getAwaitingMatch", () => {
  it("answers with the MatchSummary startMatch answers with", () => {
    expect(AppRpcs.getAwaitingMatch.success).toBe(MatchSummary);
    expect(AppRpcs.getAwaitingMatch.success).toBe(AppRpcs.startMatch.success);
    roundTrip(AppRpcs.getAwaitingMatch.success, {
      matchId: "7",
      fixtureId: 7,
      homeClubId: "home",
      homeClubName: "Castlemere United",
      awayClubId: "away",
      awayClubName: "Northgate Athletic",
      isHome: false,
    });
  });

  it("takes the save and the pending Fixture's match id", () => {
    roundTrip(AppRpcs.getAwaitingMatch.payload, { saveId: "s1", matchId: "7" });
    expect(() => Schema.decodeUnknownSync(AppRpcs.getAwaitingMatch.payload)({ saveId: "s1" })).toThrow();
  });

  it("names a missing save, an unknown match and an accepted one as typed failures", () => {
    roundTrip(AppRpcs.getAwaitingMatch.error, { _tag: "SaveNotFoundError", id: "s1" });
    roundTrip(AppRpcs.getAwaitingMatch.error, { _tag: "MatchNotFoundError", matchId: "7" });
    roundTrip(AppRpcs.getAwaitingMatch.error, { _tag: "FixtureNotPendingError", fixtureId: 7 });
  });
});
