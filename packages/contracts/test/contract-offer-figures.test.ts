import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { ContractOfferView } from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const offer = (over: Record<string, unknown> = {}): unknown => ({
  playerId: "p1",
  firstName: "Alex",
  lastName: "Brown",
  age: 24,
  positions: [{ position: "ST", familiarity: "natural" }],
  overallRating: { _tag: "range", low: 58, high: 98 },
  transferValue: { _tag: "range", low: 400000, high: 900000 },
  wage: { _tag: "range", low: 900, high: 3400 },
  ...over,
});

describe("ContractOfferView figures (ticket 09 — the offer reads by Scouting Progress)", () => {
  it("round-trips an under-scouted Free Agent's ranged offer", () => {
    roundTrip(ContractOfferView, offer());
  });

  it("round-trips a Fully Scouted offer's exact figures", () => {
    roundTrip(
      ContractOfferView,
      offer({
        overallRating: { _tag: "exact", value: 78 },
        transferValue: { _tag: "exact", value: 1_250_000 },
        wage: { _tag: "exact", value: 2_100 },
      }),
    );
  });

  it("round-trips every Position the Role choice is drawn from", () => {
    roundTrip(
      ContractOfferView,
      offer({
        positions: [
          { position: "ST", familiarity: "natural" },
          { position: "AMC", familiarity: "competent" },
        ],
      }),
    );
  });

  it("rejects an offer figure that is neither an exact value nor a range", () => {
    // Every figure on the offer is gated, so each one has to refuse a bare number too — an exact
    // value leaking through as `78` is the disclosure the whole read exists to prevent.
    for (const field of ["overallRating", "transferValue", "wage"] as const) {
      for (const bad of [
        78,
        "500000",
        { _tag: "exact" },
        { _tag: "exact", value: "78" },
        { _tag: "range", low: 58 },
        { _tag: "range", high: 98 },
        { low: 58, high: 98 },
      ]) {
        expect(() => Schema.decodeUnknownSync(ContractOfferView)(offer({ [field]: bad }))).toThrow();
      }
    }
  });

  it("drops an unrecognised key rather than letting a second figure ride along", () => {
    const decoded = Schema.decodeUnknownSync(ContractOfferView)(
      offer({ trueOverallRating: 78, wage: { _tag: "exact", value: 2_100 } }),
    );
    expect("trueOverallRating" in decoded).toBe(false);
    expect(Schema.encodeSync(ContractOfferView)(decoded)).not.toHaveProperty("trueOverallRating");
  });

  it("rejects an offer that is missing a gated figure", () => {
    for (const field of ["overallRating", "transferValue", "wage"] as const) {
      const wire = offer() as Record<string, unknown>;
      delete wire[field];
      expect(() => Schema.decodeUnknownSync(ContractOfferView)(wire)).toThrow();
    }
  });
});
