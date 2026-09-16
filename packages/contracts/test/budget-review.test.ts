import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { AppRpcs, BudgetReviewView } from "../src/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toStrictEqual(wire);
};

describe("BudgetReviewView", () => {
  it("roundtrips with typical values", () => {
    roundTrip(BudgetReviewView, {
      transferBudgetRemaining: 5000000,
      wageBudget: 2000000,
      committedWages: 1400000,
      headroom: 600000,
    });
  });

  it("roundtrips with zero values", () => {
    roundTrip(BudgetReviewView, {
      transferBudgetRemaining: 0,
      wageBudget: 0,
      committedWages: 0,
      headroom: 0,
    });
  });

  it("roundtrips when wages exceed budget (negative headroom)", () => {
    roundTrip(BudgetReviewView, {
      transferBudgetRemaining: 1000000,
      wageBudget: 1000000,
      committedWages: 1200000,
      headroom: -200000,
    });
  });
});

describe("getBudgetReviewScreen RPC", () => {
  it("roundtrips the payload", () => {
    roundTrip(AppRpcs.getBudgetReviewScreen.payload, { saveId: "s1" });
  });

  it("roundtrips the success view", () => {
    roundTrip(AppRpcs.getBudgetReviewScreen.success, {
      transferBudgetRemaining: 5000000,
      wageBudget: 2000000,
      committedWages: 1400000,
      headroom: 600000,
    });
  });

  it("roundtrips the error", () => {
    roundTrip(AppRpcs.getBudgetReviewScreen.error, {
      _tag: "SaveNotFoundError",
      id: "s2",
    });
  });
});