import { OUTFIELD_ATTRIBUTES } from "@cm-clone/shared";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { PlayerComparisonView } from "../src/schemas/playerComparison.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

/** Every outfield Attribute carrying an exact figure — the profile-value variant of the wire, so a
 *  row's required outfield set is spelled out once instead of once per test. */
const outfieldFigures = Object.fromEntries(
  OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, { _tag: "exact", value: 70 }]),
) as Record<string, { readonly _tag: "exact"; readonly value: 70 }>;

const ownSquadRow = {
  id: "p1",
  firstName: "Alex",
  lastName: "Brown",
  age: 24,
  nationality: "nation_eng",
  clubId: "c1",
  clubName: "Castlemere United",
  positions: [{ position: "ST", familiarity: "natural" }],
  attributes: { ...outfieldFigures, gkHandling: { _tag: "exact", value: 50 } },
  overallRating: { _tag: "exact", value: 78 },
  transferValue: { _tag: "exact", value: 420000 },
  wage: 1500,
  contractExpiry: "3 years",
  injuryStatus: "fit",
};

describe("PlayerComparisonView (ticket 12 — the comparison read)", () => {
  it("round-trips an own-squad exact column beside a ranged rival column", () => {
    roundTrip(PlayerComparisonView, {
      rows: [
        ownSquadRow,
        {
          id: "p2",
          firstName: "Chris",
          lastName: "Carter",
          age: 26,
          nationality: "nation_fra",
          clubId: null,
          clubName: null,
          positions: [{ position: "MC", familiarity: "natural" }],
          attributes: {
            ...outfieldFigures,
            finishing: { _tag: "range", low: 58, high: 98 },
          },
          overallRating: { _tag: "range", low: 58, high: 98 },
          transferValue: { _tag: "range", low: 120000, high: 750000 },
          // A Free Agent has no Contract: wage is absent by null, never a spare zero.
          wage: null,
          contractExpiry: "Free Agent",
          injuryStatus: "knock",
        },
      ],
    });
  });

  it("round-trips an empty comparison — no players to set side by side", () => {
    roundTrip(PlayerComparisonView, { rows: [] });
  });

  it("rejects a row whose attribute figure is neither an exact value nor a range", () => {
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
        Schema.decodeUnknownSync(PlayerComparisonView)({
          rows: [
            {
              ...ownSquadRow,
              id: "p2",
              attributes: { ...outfieldFigures, finishing: bad },
            },
          ],
        }),
      ).toThrow();
    }
  });

  it("rejects a row missing a required outfield Attribute figure", () => {
    const withoutFinishing = Object.fromEntries(
      OUTFIELD_ATTRIBUTES.filter((attribute) => attribute !== "finishing").map((attribute) => [
        attribute,
        { _tag: "exact", value: 70 },
      ]),
    );
    expect(() =>
      Schema.decodeUnknownSync(PlayerComparisonView)({
        rows: [{ ...ownSquadRow, attributes: withoutFinishing }],
      }),
    ).toThrow();
  });

  it("never carries a hidden Attribute on the wire", () => {
    const withHidden = {
      rows: [
        {
          ...ownSquadRow,
          attributes: { ...outfieldFigures, gkHandling: { _tag: "exact", value: 50 }, injuryProneness: { _tag: "exact", value: 12 } },
        },
      ],
    };
    const decoded = Schema.decodeUnknownSync(PlayerComparisonView)(withHidden);
    const encoded = Schema.encodeSync(PlayerComparisonView)(decoded);
    expect(encoded).toEqual({ rows: [ownSquadRow] });
  });
});

describe("getPlayerComparison over the AppRpcs union (ticket 12 — the read in the RPC table)", () => {
  it("answers with the PlayerComparisonView the comparison read does", () => {
    expect(AppRpcs.getPlayerComparison.success).toBe(PlayerComparisonView);
    roundTrip(AppRpcs.getPlayerComparison.success, {
      rows: [ownSquadRow],
    });
  });

  it("carries the save id and the whole chosen set of player ids together", () => {
    roundTrip(AppRpcs.getPlayerComparison.payload, {
      saveId: "s1",
      playerIds: ["p1", "p2", "p3"],
    });
  });

  it("round-trips an empty player set — the screen opens with nothing to compare", () => {
    roundTrip(AppRpcs.getPlayerComparison.payload, { saveId: "s1", playerIds: [] });
  });

  it("names a missing save and a missing player as its two typed failures", () => {
    roundTrip(AppRpcs.getPlayerComparison.error, { _tag: "SaveNotFoundError", id: "s1" });
    roundTrip(AppRpcs.getPlayerComparison.error, { _tag: "PlayerNotFoundError", playerId: "p2" });
  });
});