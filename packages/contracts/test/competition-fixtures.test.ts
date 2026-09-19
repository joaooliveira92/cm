import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("getCompetitionFixtures", () => {
  const fixture = (played: boolean) => ({
    id: 1,
    round: 1,
    date: "2024-08-10",
    homeClubId: "club-1",
    homeClubName: "Ashford Athletic",
    awayClubId: "club-4",
    awayClubName: "Bridgeport City",
    homeGoals: played ? 3 : null,
    awayGoals: played ? 1 : null,
    played,
  });

  const view = {
    season: {
      seasonNumber: 1,
      currentDate: "2024-08-15",
      phase: "in_season",
      awaitingFixture: null,
    },
    fixtures: [fixture(true), fixture(false)],
  };

  it("payload round-trips saveId and competitionId", () => {
    roundTrip(AppRpcs.getCompetitionFixtures.payload, { saveId: "s1", competitionId: "league-1" });
  });

  it("rejects a payload missing the competition it is scoped to", () => {
    expect(() =>
      Schema.decodeUnknownSync(AppRpcs.getCompetitionFixtures.payload)({ saveId: "s1" }),
    ).toThrow();
  });

  it("success round-trips played and unplayed fixtures, keeping unplayed scores null", () => {
    roundTrip(AppRpcs.getCompetitionFixtures.success, view);
  });

  it("error schema round-trips a missing save", () => {
    roundTrip(AppRpcs.getCompetitionFixtures.error, { _tag: "SaveNotFoundError", id: "s1" });
  });

  // The read folds `toSeasonView`, which can raise this. Declaring it keeps the failure typed
  // across the boundary instead of arriving as a raw error the renderer cannot describe.
  it("error schema round-trips a pending-fixture integrity failure", () => {
    roundTrip(AppRpcs.getCompetitionFixtures.error, {
      _tag: "PendingFixtureIntegrityError",
      fixtureId: 1,
      reason: "awaiting fixture is not in the current season",
    });
  });
});
