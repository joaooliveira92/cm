import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";

/**
 * The wire shape of the two procedures Screen 137 added (group-j ticket 09).
 *
 * They live here rather than in `roundtrip.test.ts` because the Contract Offer is a vertical slice
 * with its own failure vocabulary: a read that may say the Player is not a Free Agent, and a command
 * that now refuses any payload which does not name all three terms. A wire that drifts on either
 * point is invisible to a shared round-trip suite, so these assert the refusals too.
 */

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const offer = {
  playerId: "p1",
  firstName: "Alex",
  lastName: "Brown",
  age: 24,
  positions: [{ position: "ST", familiarity: "natural" }],
  overallRating: { _tag: "range", low: 58, high: 98 },
  transferValue: { _tag: "range", low: 400_000, high: 900_000 },
  wage: { _tag: "range", low: 900, high: 3400 },
};

const terms = { saveId: "s1", playerId: "p1", role: "Poacher", years: 3, wage: 2_100 };

describe("the Contract Offer procedures (ticket 09)", () => {
  it("getContractOffer round-trips its payload and its ranged offer", () => {
    roundTrip(AppRpcs.getContractOffer.payload, { saveId: "s1", playerId: "p1" });
    roundTrip(AppRpcs.getContractOffer.success, offer);
  });

  it("getContractOffer reports a player who is not a Free Agent on the wire", () => {
    roundTrip(AppRpcs.getContractOffer.error, { _tag: "PlayerNotFoundError", playerId: "p1" });
    roundTrip(AppRpcs.getContractOffer.error, { _tag: "PlayerNotFreeAgentError", playerId: "p1" });
  });

  it("signFreeAgent round-trips the three terms it now takes", () => {
    roundTrip(AppRpcs.signFreeAgent.payload, terms);
  });

  it("signFreeAgent refuses a payload missing a term — the old years-only call is gone", () => {
    for (const missing of [
      { saveId: "s1", playerId: "p1", years: 3, wage: 2_100 },
      { saveId: "s1", playerId: "p1", role: "Poacher", wage: 2_100 },
      { saveId: "s1", playerId: "p1", role: "Poacher", years: 3 },
    ]) {
      expect(() => Schema.decodeUnknownSync(AppRpcs.signFreeAgent.payload)(missing)).toThrow();
    }
  });

  it("signFreeAgent refuses a Role outside the tactical vocabulary", () => {
    expect(() =>
      Schema.decodeUnknownSync(AppRpcs.signFreeAgent.payload)({ ...terms, role: "Sweeper" }),
    ).toThrow();
  });

  it("signFreeAgent carries the reason its terms were refused", () => {
    roundTrip(AppRpcs.signFreeAgent.error, {
      _tag: "InvalidContractOfferTermsError",
      playerId: "p1",
      reason: "Anchorman is not a Role this player holds",
    });
  });
});
