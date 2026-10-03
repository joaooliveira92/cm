import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { AppRpcs, TransferHistoryEntryView, TransferHistoryView } from "../src/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toStrictEqual(wire);
};

const paidTransfer = {
  id: 12,
  transferredOn: "2026-07-14",
  playerFirstName: "John",
  playerLastName: "Smith",
  fromClubName: "Rival FC",
  toClubName: "Our Club",
  fee: 4_500_000,
};

/** A **Free Agent** signing: no selling Club, and a Credits 0 fee (CONTEXT.md, Free Agent). */
const freeAgentSigning = {
  id: 13,
  transferredOn: "2026-07-01",
  playerFirstName: "Jane",
  playerLastName: "Doe",
  fromClubName: null,
  toClubName: "Our Club",
  fee: 0,
};

describe("TransferHistoryEntryView", () => {
  it("roundtrips a paid transfer between two Clubs", () => {
    roundTrip(TransferHistoryEntryView, paidTransfer);
  });

  it("roundtrips a Free Agent signing, whose selling Club is null", () => {
    roundTrip(TransferHistoryEntryView, freeAgentSigning);
  });
});

describe("TransferHistoryView", () => {
  it("roundtrips a populated history", () => {
    roundTrip(TransferHistoryView, { entries: [paidTransfer, freeAgentSigning] });
  });

  it("roundtrips an empty history", () => {
    roundTrip(TransferHistoryView, { entries: [] });
  });
});

describe("getTransferHistoryScreen RPC", () => {
  it("roundtrips the payload", () => {
    roundTrip(AppRpcs.getTransferHistoryScreen.payload, { saveId: "s1" });
  });

  it("roundtrips the success view, including a Free Agent signing", () => {
    roundTrip(AppRpcs.getTransferHistoryScreen.success, {
      entries: [paidTransfer, freeAgentSigning],
    });
  });

  it("roundtrips an empty success view", () => {
    roundTrip(AppRpcs.getTransferHistoryScreen.success, { entries: [] });
  });

  it("roundtrips the error", () => {
    roundTrip(AppRpcs.getTransferHistoryScreen.error, {
      _tag: "SaveNotFoundError",
      id: "s2",
    });
  });
});
