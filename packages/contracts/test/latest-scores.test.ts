import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { LatestScoresView } from "../src/index.js";

const wire = {
  date: "2026-08-01",
  resolved: true,
  groups: [
    {
      competitionId: "league_eng_1",
      competitionName: "English League One",
      fixtures: [
        {
          id: 2,
          homeClubId: "club_b",
          homeClubName: "Beta FC",
          awayClubId: "club_c",
          awayClubName: "Gamma FC",
          homeGoals: 2,
          awayGoals: 1,
          homePenalties: null,
          awayPenalties: null,
        },
      ],
    },
    {
      competitionId: "cup_eng",
      competitionName: "English Cup",
      fixtures: [
        {
          id: 3,
          homeClubId: "club_d",
          homeClubName: "Delta FC",
          awayClubId: "club_e",
          awayClubName: "Epsilon FC",
          homeGoals: 1,
          awayGoals: 1,
          homePenalties: 4,
          awayPenalties: 3,
        },
      ],
    },
  ],
};

describe("Latest Scores", () => {
  it("LatestScoresView round-trips a scored fixture, a shootout and an unresolved null score", () => {
    expect(Schema.encodeSync(LatestScoresView)(Schema.decodeSync(LatestScoresView)(wire))).toEqual(wire);
  });

  it("keeps every score nullable, so an unresolved Matchday can carry no result", () => {
    const unresolved = {
      date: "2026-08-01",
      resolved: false,
      groups: [
        {
          competitionId: "league_eng_1",
          competitionName: "English League One",
          fixtures: [
            {
              id: 2,
              homeClubId: "club_b",
              homeClubName: "Beta FC",
              awayClubId: "club_c",
              awayClubName: "Gamma FC",
              homeGoals: null,
              awayGoals: null,
              homePenalties: null,
              awayPenalties: null,
            },
          ],
        },
      ],
    };
    expect(
      Schema.encodeSync(LatestScoresView)(Schema.decodeSync(LatestScoresView)(unresolved)),
    ).toEqual(unresolved);
  });

  it("the RPC payload, success and error arms all decode", () => {
    expect(Schema.decodeSync(AppRpcs.getLatestScores.payload)({ saveId: "s1" })).toBeTruthy();
    expect(Schema.decodeSync(AppRpcs.getLatestScores.success)(wire)).toBeTruthy();
    expect(
      Schema.decodeSync(AppRpcs.getLatestScores.error)({
        _tag: "PendingFixtureIntegrityError",
        fixtureId: null,
        reason: "a match is linked but no fixture is pending",
      }),
    ).toBeTruthy();
  });

  it("the latest-report RPC takes a save and can answer null", () => {
    expect(Schema.decodeSync(AppRpcs.getLatestMatchReport.payload)({ saveId: "s1" })).toBeTruthy();
    expect(Schema.decodeSync(AppRpcs.getLatestMatchReport.success)(null)).toBeNull();
  });
});
