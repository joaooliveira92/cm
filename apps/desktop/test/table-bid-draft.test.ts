import { describe, expect, it } from "vitest";
import {
  BID_DRAFT_EMPTY,
  bidDraftOf,
  isValidBidAmount,
  reduceBidDraft,
  type BidDraftState,
} from "../src/renderer/table/bidDraft.js";

describe("AC-29 — the single Bid draft dirty-draft lifecycle", () => {
  const focusedDirty = (playerId = "p1", amount = "450"): BidDraftState => ({
    _tag: "focused",
    draft: { playerId, amountInput: amount, dirty: true },
  });
  const focusedClean = (playerId = "p1"): BidDraftState => ({
    _tag: "focused",
    draft: { playerId, amountInput: "", dirty: false },
  });

  it("a fresh selection with no draft retargets cleanly", () => {
    const next = reduceBidDraft(BID_DRAFT_EMPTY, { _tag: "selectionChangedTo", playerId: "p2" });
    expect(next).toEqual({
      _tag: "focused",
      draft: { playerId: "p2", amountInput: "", dirty: false },
    });
  });

  it("deselecting with no draft keeps the empty state", () => {
    expect(reduceBidDraft(BID_DRAFT_EMPTY, { _tag: "selectionChangedTo", playerId: null })).toBe(
      BID_DRAFT_EMPTY,
    );
  });

  it("typing marks the draft dirty; clearing the amount un-dirties it", () => {
    const mid = reduceBidDraft(focusedClean(), { _tag: "amountChanged", value: "500" });
    expect((mid as { draft: { dirty: boolean } }).draft.dirty).toBe(true);
    const cleared = reduceBidDraft(mid, { _tag: "amountChanged", value: " " });
    expect((cleared as { draft: { dirty: boolean } }).draft.dirty).toBe(false);
  });

  it("a clean draft retargets on selection change — no confirm needed", () => {
    const next = reduceBidDraft(focusedClean("p1"), { _tag: "selectionChangedTo", playerId: "p9" });
    expect(next).toEqual({
      _tag: "focused",
      draft: { playerId: "p9", amountInput: "", dirty: false },
    });
  });

  it("a DIRTY draft on selection change enters confirmDiscard — never silent discard", () => {
    const next = reduceBidDraft(focusedDirty("p1"), {
      _tag: "selectionChangedTo",
      playerId: "p9",
    });
    expect(next).toMatchObject({
      _tag: "confirmDiscard",
      draft: { playerId: "p1", amountInput: "450", dirty: true },
      pendingPlayerId: "p9",
    });
  });

  it("keepCurrent keeps the drafted player and its amount", () => {
    const confirm = reduceBidDraft(focusedDirty("p1"), {
      _tag: "selectionChangedTo",
      playerId: "p9",
    });
    const kept = reduceBidDraft(confirm, { _tag: "keepCurrent" });
    expect(kept).toEqual({ _tag: "focused", draft: { playerId: "p1", amountInput: "450", dirty: true } });
  });

  it("discardRequested moves to the pending player (retarget), or empties when deselecting", () => {
    const confirm = reduceBidDraft(focusedDirty("p1"), {
      _tag: "selectionChangedTo",
      playerId: "p9",
    });
    expect(reduceBidDraft(confirm, { _tag: "discardRequested" })).toEqual({
      _tag: "focused",
      draft: { playerId: "p9", amountInput: "", dirty: false },
    });
    const deselect = reduceBidDraft(focusedDirty("p1"), {
      _tag: "selectionChangedTo",
      playerId: null,
    });
    expect(reduceBidDraft(deselect, { _tag: "discardRequested" })).toBe(BID_DRAFT_EMPTY);
  });

  it("re-selecting the drafted player while confirming is a no-op (the confirm is moot)", () => {
    const confirm = reduceBidDraft(focusedDirty("p1"), {
      _tag: "selectionChangedTo",
      playerId: "p9",
    });
    const reselect = reduceBidDraft(confirm, { _tag: "selectionChangedTo", playerId: "p1" });
    expect(reselect).toEqual({ _tag: "focused", draft: { playerId: "p1", amountInput: "450", dirty: true } });
  });

  it("successful submission clears the draft", () => {
    expect(reduceBidDraft(focusedDirty(), { _tag: "submitted" })).toBe(BID_DRAFT_EMPTY);
  });

  it("save reload clears the draft", () => {
    expect(reduceBidDraft(focusedDirty(), { _tag: "savedReloaded" })).toBe(BID_DRAFT_EMPTY);
  });

  it("player becomes unavailable clears the draft (and the screen disables + announces)", () => {
    expect(reduceBidDraft(focusedDirty(), { _tag: "playerUnavailable" })).toBe(BID_DRAFT_EMPTY);
  });

  it("roving focus movement is NOT an event in the draft model — focus ≠ selection", () => {
    // The reducer union has no focus-movement variant: a screen roving with
    // arrow keys must not dispatch selectionChangedTo. keepCurrent is the only
    // way a focused draft stays put, and it preserves player + amount exactly.
    const kept = reduceBidDraft(focusedDirty(), { _tag: "keepCurrent" });
    expect(kept._tag).toBe("focused");
    expect((kept as Extract<BidDraftState, { _tag: "focused" }>).draft).toEqual({
      playerId: "p1",
      amountInput: "450",
      dirty: true,
    });
  });

  it("bidDraftOf reads the current draft out of any state shape", () => {
    expect(bidDraftOf(BID_DRAFT_EMPTY)).toBeNull();
    expect(bidDraftOf(focusedClean("p1"))?.playerId).toBe("p1");
  });
});

describe("F8 — bid amount validity: finite and positive, never NaN-enabled", () => {
  it("rejects empty, zero, negative, non-numeric and non-finite input", () => {
    expect(isValidBidAmount("")).toBe(false);
    expect(isValidBidAmount("   ")).toBe(false);
    expect(isValidBidAmount("0")).toBe(false);
    expect(isValidBidAmount("-5")).toBe(false);
    expect(isValidBidAmount("abc")).toBe(false);
    expect(isValidBidAmount("12.5x")).toBe(false);
    expect(isValidBidAmount("1e999")).toBe(false); // Infinity
  });

  it("accepts a finite positive amount (the Bid button may enable)", () => {
    expect(isValidBidAmount("1")).toBe(true);
    expect(isValidBidAmount("500000")).toBe(true);
    expect(isValidBidAmount("12.5")).toBe(true);
  });
});