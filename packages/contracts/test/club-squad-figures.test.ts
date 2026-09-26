import { OUTFIELD_ATTRIBUTES } from "@cm-clone/shared";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { ClubSquadPlayerView } from "../src/schemas/index.js";

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

const playerBase = {
  id: "p1",
  firstName: "Rui",
  lastName: "Costa",
  age: 27,
  positions: [{ position: "MC", familiarity: "natural" }],
  nationality: "Portugal",
  birthplace: "Porto",
};

describe("ClubSquadView figures (screen 35 — the any-club squad reads by Scouting Progress)", () => {
  it("round-trips the manager's own club: every figure exact", () => {
    roundTrip(ClubSquadPlayerView, {
      ...playerBase,
      attributes: outfieldFigures({
        crossing: { _tag: "exact", value: 14 },
        "injuryProneness": { _tag: "exact", value: 10 },
      }),
      overallRating: { _tag: "exact", value: 74 },
    });
  });

  it("round-trips a rival below Fully Scouted: every figure an Attribute Range", () => {
    roundTrip(ClubSquadPlayerView, {
      ...playerBase,
      attributes: outfieldFigures({
        crossing: { _tag: "range", low: 8, high: 20 },
        pace: { _tag: "range", low: 4, high: 20 },
      }),
      overallRating: { _tag: "range", low: 50, high: 98 },
    });
  });

  it("rejects a figure that is neither an exact value nor a range", () => {
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
        Schema.decodeUnknownSync(ClubSquadPlayerView)({
          ...playerBase,
          attributes: outfieldFigures({ crossing: bad }),
          overallRating: { _tag: "exact", value: 74 },
        }),
      ).toThrow();
    }
  });

  it("rejects a required outfield Attribute that is absent from the wire", () => {
    const attributes = outfieldFigures();
    delete attributes.pace;
    expect(() =>
      Schema.decodeUnknownSync(ClubSquadPlayerView)({
        ...playerBase,
        attributes,
        overallRating: { _tag: "exact", value: 74 },
      }),
    ).toThrow();
  });
});