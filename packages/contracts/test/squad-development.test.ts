import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { SquadDevelopmentPlayerView, SquadDevelopmentView } from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const player = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  firstName: "Ana",
  lastName: "Reis",
  trainingFocus: "technical",
  latestSeason: {
    seasonNumber: 2,
    comparedWithSeason: 1,
    changes: [
      { attribute: "passing", from: 11, to: 12 },
      { attribute: "pace", from: 16, to: 15 },
    ],
  },
  ...overrides,
});

describe("Player Development Centre squad read (Screen 114)", () => {
  it("SquadDevelopmentPlayerView round-trips a compared Season, the earliest recorded one, and none", () => {
    roundTrip(SquadDevelopmentPlayerView, player());
    roundTrip(
      SquadDevelopmentPlayerView,
      player({ trainingFocus: null, latestSeason: { seasonNumber: 1, comparedWithSeason: null, changes: [] } }),
    );
    roundTrip(SquadDevelopmentPlayerView, player({ latestSeason: null }));
  });

  it("rejects a missing latestSeason (null is the explicit nothing-recorded value)", () => {
    expect(() => Schema.decodeUnknownSync(SquadDevelopmentPlayerView)(player({ latestSeason: undefined }))).toThrow();
  });

  it("rejects a hidden Attribute change and an unknown Training Focus", () => {
    expect(() =>
      Schema.decodeUnknownSync(SquadDevelopmentPlayerView)(
        player({
          latestSeason: {
            seasonNumber: 2,
            comparedWithSeason: 1,
            changes: [{ attribute: "injuryProneness", from: 5, to: 6 }],
          },
        }),
      ),
    ).toThrow();
    expect(() => Schema.decodeUnknownSync(SquadDevelopmentPlayerView)(player({ trainingFocus: "tactical" }))).toThrow();
  });

  it("SquadDevelopmentView round-trips a squad and an empty one", () => {
    roundTrip(SquadDevelopmentView, { players: [player(), player({ id: "p2", latestSeason: null })] });
    roundTrip(SquadDevelopmentView, { players: [] });
  });

  it("is the getSquadDevelopment success schema, with a saveId payload and a SaveNotFoundError failure", () => {
    expect(AppRpcs.getSquadDevelopment.success).toBe(SquadDevelopmentView);
    roundTrip(AppRpcs.getSquadDevelopment.payload, { saveId: "s1" });
    roundTrip(AppRpcs.getSquadDevelopment.error, { _tag: "SaveNotFoundError", id: "s1" });
  });
});
