import { OUTFIELD_ATTRIBUTES } from "@cm-clone/shared";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { PlayerProfileView } from "../src/schemas/index.js";

/** Every required outfield Attribute, each an exact figure; then override a spoke in a test. */
const outfieldFigures = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, { _tag: "exact", value: 12 }])),
  ...over,
});

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("PlayerProfileView figures (ticket 10 — the player screens read by Scouting Progress)", () => {
  const profileBase = {
    id: "p1",
    firstName: "Rui",
    lastName: "Costa",
    age: 27,
    nationality: "Portugal",
    birthplace: "Porto",
    positions: [{ position: "MC", familiarity: "natural" }],
    club: { id: "c1", name: "Castlemere United", statureTier: "mid" },
    contractExpiry: "2 years",
    injuryStatus: "fit",
  };

  it("round-trips an own-club player's exact figures across the profile wire", () => {
    roundTrip(PlayerProfileView, {
      ...profileBase,
      attributes: outfieldFigures({
        crossing: { _tag: "exact", value: 14 },
        pace: { _tag: "exact", value: 12 },
        "injuryProneness": { _tag: "exact", value: 10 },
      }),
      overallRating: { _tag: "exact", value: 74 },
      transferValue: { _tag: "exact", value: 11200000 },
    });
  });

  it("round-trips ranged figures for an under-scouted rival player, hidden attributes absent", () => {
    roundTrip(PlayerProfileView, {
      ...profileBase,
      attributes: outfieldFigures({
        crossing: { _tag: "range", low: 8, high: 20 },
        pace: { _tag: "range", low: 4, high: 20 },
        // An outfield player carries no Goalkeeping figure at all (CONTEXT.md), and a hidden
        // attribute is optional: a rival with no scouting row simply omits it — never a 0, never
        // a bound from a value that is not on the wire.
      }),
      overallRating: { _tag: "range", low: 50, high: 98 },
      transferValue: { _tag: "range", low: 1700000, high: 24000000 },
    });
  });

  it("rejects a profile figure that is neither an exact value nor a range", () => {
    for (const bad of [
      14,
      "12",
      { _tag: "exact" },
      { _tag: "exact", value: "14" },
      { _tag: "range", low: 8 },
      { _tag: "range", high: 20 },
      { low: 8, high: 20 },
    ]) {
      expect(() =>
        Schema.decodeUnknownSync(PlayerProfileView)({
          ...profileBase,
          attributes: outfieldFigures({ crossing: bad }),
          overallRating: { _tag: "exact", value: 74 },
          transferValue: { _tag: "exact", value: 11200000 },
        }),
      ).toThrow();
    }
  });

  it("rejects a required outfield Attribute that is absent from the wire", () => {
    const attributes = outfieldFigures();
    delete attributes.pace;
    expect(() =>
      Schema.decodeUnknownSync(PlayerProfileView)({
        ...profileBase,
        attributes,
        overallRating: { _tag: "exact", value: 74 },
        transferValue: { _tag: "exact", value: 11200000 },
      }),
    ).toThrow();
  });
});