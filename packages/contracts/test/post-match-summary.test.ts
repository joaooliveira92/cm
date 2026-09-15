import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { PostMatchSummaryView } from "../src/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("Post-Match Summary (Screen 99)", () => {
  it("PostMatchSummaryView round-trips goals, cards and injuries", () => {
    roundTrip(PostMatchSummaryView, {
      matchId: "m1",
      homeClubId: "c1",
      homeClubName: "Castlemere United",
      awayClubId: "c2",
      awayClubName: "Northgate Athletic",
      homeScore: 1,
      awayScore: 0,
      events: [
        { minute: 23, kind: "Goal", clubId: "c1", playerId: "p1", playerName: "Alex Brown" },
        { minute: 61, kind: "RedCard", clubId: "c2", playerId: "p2", playerName: "Sam Reed" },
      ],
    });
  });

  it("rejects an event kind the summary does not list", () => {
    expect(() =>
      Schema.decodeUnknownSync(PostMatchSummaryView)({
        matchId: "m1",
        homeClubId: "c1",
        homeClubName: "A",
        awayClubId: "c2",
        awayClubName: "B",
        homeScore: 0,
        awayScore: 0,
        events: [{ minute: 5, kind: "ShotMissed", clubId: "c1", playerId: "p1", playerName: "X" }],
      }),
    ).toThrow();
    expect(AppRpcs.getPostMatchSummary.success).toBe(PostMatchSummaryView);
  });
});

