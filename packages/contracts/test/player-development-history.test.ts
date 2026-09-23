import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import {
  AttributeChangeView,
  PlayerDevelopmentHistoryView,
  SeasonDevelopmentView,
  VisibleAttributeSchema,
} from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const season = (overrides: Record<string, unknown> = {}) => ({
  seasonNumber: 2,
  comparedWithSeason: 1,
  changes: [
    { attribute: "passing", from: 11, to: 12 },
    { attribute: "gkReflexes", from: 14, to: 15 },
  ],
  ...overrides,
});

describe("Performance Report development history (Screen 113)", () => {
  it("AttributeChangeView round-trips an outfield and a goalkeeping Attribute", () => {
    roundTrip(AttributeChangeView, { attribute: "pace", from: 15, to: 14 });
    roundTrip(AttributeChangeView, { attribute: "gkHandling", from: 9, to: 10 });
  });

  it("rejects a hidden Attribute, so Injury Proneness cannot reach the renderer", () => {
    expect(() => Schema.decodeUnknownSync(VisibleAttributeSchema)("injuryProneness")).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(AttributeChangeView)({ attribute: "injuryProneness", from: 5, to: 6 }),
    ).toThrow();
  });

  it("rejects an unknown Attribute name or a non-finite value", () => {
    expect(() => Schema.decodeUnknownSync(AttributeChangeView)({ attribute: "overallRating", from: 5, to: 6 })).toThrow();
    expect(() =>
      Schema.decodeSync(AttributeChangeView)({ attribute: "pace", from: Number.NaN, to: 6 }),
    ).toThrow();
  });

  it("SeasonDevelopmentView round-trips a compared Season and the earliest recorded one", () => {
    roundTrip(SeasonDevelopmentView, season());
    roundTrip(SeasonDevelopmentView, season({ seasonNumber: 1, comparedWithSeason: null, changes: [] }));
  });

  it("rejects a missing comparedWithSeason (null is the explicit no-baseline value)", () => {
    expect(() =>
      Schema.decodeUnknownSync(SeasonDevelopmentView)(season({ comparedWithSeason: undefined })),
    ).toThrow();
  });

  it("PlayerDevelopmentHistoryView round-trips a history and an empty one", () => {
    roundTrip(PlayerDevelopmentHistoryView, {
      playerId: "p1",
      seasons: [season(), season({ seasonNumber: 1, comparedWithSeason: null, changes: [] })],
    });
    roundTrip(PlayerDevelopmentHistoryView, { playerId: "p1", seasons: [] });
  });

  it("is the getPlayerDevelopmentHistory success schema", () => {
    expect(AppRpcs.getPlayerDevelopmentHistory.success).toBe(PlayerDevelopmentHistoryView);
  });

  it("getPlayerDevelopmentHistory payload round-trips a saveId and playerId", () => {
    roundTrip(AppRpcs.getPlayerDevelopmentHistory.payload, { saveId: "s1", playerId: "p1" });
  });

  it("getPlayerDevelopmentHistory error schema round-trips each failure", () => {
    roundTrip(AppRpcs.getPlayerDevelopmentHistory.error, { _tag: "SaveNotFoundError", id: "s1" });
    roundTrip(AppRpcs.getPlayerDevelopmentHistory.error, { _tag: "PlayerNotFoundError", playerId: "p1" });
    roundTrip(AppRpcs.getPlayerDevelopmentHistory.error, { _tag: "NotYourPlayerError", playerId: "p1" });
  });
});
