import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  PlayerSearchQuerySchema,
  PlayerSearchResultsView,
} from "../src/schemas/playerSearch.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("PlayerSearchQuerySchema (ticket 11 — the search wire)", () => {
  it("round-trips a fully-filtered query", () => {
    roundTrip(PlayerSearchQuerySchema, {
      name: "Ridler",
      minAge: 21,
      maxAge: 30,
      position: "ST",
      nationality: "nation_eng",
      clubName: "Castlemere United",
    });
  });

  it("round-trips the empty query — the whole save", () => {
    roundTrip(PlayerSearchQuerySchema, {});
  });

  it("round-trips a query with only the filters the manager set", () => {
    const decoded = Schema.decodeUnknownSync(PlayerSearchQuerySchema)({
      name: "son",
      minAge: 18,
    });
    expect(decoded).toEqual({ name: "son", minAge: 18 });
    expect(Schema.encodeSync(PlayerSearchQuerySchema)(decoded)).toEqual({
      name: "son",
      minAge: 18,
    });
  });

  it("rejects a position that is not one of the game's positions", () => {
    expect(() =>
      Schema.decodeUnknownSync(PlayerSearchQuerySchema)({ position: "Quarterback" }),
    ).toThrow();
  });
});

describe("PlayerSearchResultsView (ticket 11 — one result pool, whole save)", () => {
  it("round-trips an own-squad row (exact) beside a ranged rival in one result set", () => {
    roundTrip(PlayerSearchResultsView, {
      total: 2,
      results: [
        {
          id: "p1",
          firstName: "Alex",
          lastName: "Brown",
          age: 24,
          clubId: "c1",
          clubName: "Castlemere United",
          nationality: "nation_eng",
          overallRating: { _tag: "exact", value: 78 },
          transferValue: { _tag: "exact", value: 420000 },
          positions: [{ position: "ST", familiarity: "natural" }],
        },
        {
          id: "p2",
          firstName: "Chris",
          lastName: "Carter",
          age: 26,
          clubId: null,
          clubName: null,
          nationality: "nation_fra",
          overallRating: { _tag: "range", low: 58, high: 98 },
          transferValue: { _tag: "range", low: 120000, high: 750000 },
          positions: [{ position: "MC", familiarity: "natural" }],
        },
      ],
    });
  });

  it("rejects a result row whose figure is neither an exact value nor a range", () => {
    for (const bad of [
      78,
      "500000",
      { _tag: "exact" },
      { _tag: "exact", value: "78" },
      { _tag: "range", low: 58 },
      { _tag: "range", high: 98 },
      { low: 58, high: 98 },
    ]) {
      expect(() =>
        Schema.decodeUnknownSync(PlayerSearchResultsView)({
          total: 1,
          results: [
            {
              id: "p2",
              firstName: "Chris",
              lastName: "Carter",
              age: 26,
              clubId: null,
              clubName: null,
              nationality: "nation_fra",
              overallRating: bad,
              transferValue: { _tag: "range", low: 58, high: 98 },
              positions: [{ position: "MC", familiarity: "natural" }],
            },
          ],
        }),
      ).toThrow();
    }
  });
});