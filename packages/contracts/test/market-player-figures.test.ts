import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { MarketPlayerView } from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("MarketPlayerView figures (ticket 09 — the market reads by Scouting Progress)", () => {
  it("round-trips a free agent's scouted figures", () => {
    roundTrip(MarketPlayerView, {
      id: "p1",
      firstName: "Alex",
      lastName: "Brown",
      age: 24,
      clubId: null,
      clubName: null,
      overallRating: { _tag: "exact", value: 78 },
      transferValue: { _tag: "range", low: 400000, high: 620000 },
      positions: [{ position: "ST", familiarity: "natural" }],
    });
  });

  it("round-trips ranged figures for an under-scouted rival player", () => {
    roundTrip(MarketPlayerView, {
      id: "p2",
      firstName: "Chris",
      lastName: "Carter",
      age: 26,
      clubId: "c1",
      clubName: "Castlemere United",
      overallRating: { _tag: "range", low: 58, high: 98 },
      transferValue: { _tag: "range", low: 120000, high: 750000 },
      positions: [{ position: "MC", familiarity: "natural" }],
    });
  });

  it("rejects a market figure that is neither an exact value nor a range", () => {
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
        Schema.decodeUnknownSync(MarketPlayerView)({
          id: "p2",
          firstName: "Chris",
          lastName: "Carter",
          age: 26,
          clubId: "c1",
          clubName: "Castlemere United",
          overallRating: bad,
          transferValue: { _tag: "range", low: 58, high: 98 },
          positions: [{ position: "MC", familiarity: "natural" }],
        }),
      ).toThrow();
    }
  });
});