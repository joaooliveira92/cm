/**
 * The single Bid draft and its dirty-draft lifecycle (note: Bid input: a
 * contextual Actions region, AC-29). One `BidDraft { playerId, amountInput,
 * dirty }` serves the whole Transfers screen. The lifecycle is a pure reducer
 * over explicit events — selection changes never silently discard a dirty
 * draft; a dirty draft surfaces a `confirmDiscard` state that only an explicit
 * Keep/Discard resolves. Focus movement is deliberately NOT an event here:
 * focus ≠ selection, so roving never touches the draft.
 */
export interface BidDraft {
  readonly playerId: string;
  readonly amountInput: string;
  /** True once an amount has been typed — losing it (on retarget) is lossful. */
  readonly dirty: boolean;
}

export type BidDraftState =
  | { readonly _tag: "empty"; readonly draft: null }
  | { readonly _tag: "focused"; readonly draft: BidDraft }
  /** Dirty draft kept, new selection pending an explicit discard decision. */
  | {
      readonly _tag: "confirmDiscard";
      readonly draft: BidDraft;
      readonly pendingPlayerId: string | null;
    };

export type BidDraftEvent =
  | { readonly _tag: "selectionChangedTo"; readonly playerId: string | null }
  | { readonly _tag: "amountChanged"; readonly value: string }
  | { readonly _tag: "submitted" }
  | { readonly _tag: "savedReloaded" }
  | { readonly _tag: "playerUnavailable" }
  | { readonly _tag: "discardRequested" }
  | { readonly _tag: "keepCurrent" };

export const BID_DRAFT_EMPTY: BidDraftState = { _tag: "empty", draft: null };

/** A draft amount is submittable only when it parses to a finite positive
 *  number. `NaN`, `Infinity`, zero, negatives and the empty string are all
 *  invalid — a non-numeric keystroke must never enable the Bid button (NaN ≤ 0
 *  is false, so a bare `<= 0` test would let "abc" through). Single home for
 *  the rule: the disabled predicate AND the submit guard read it together. */
export const isValidBidAmount = (amountInput: string): boolean => {
  const amount = Number(amountInput);
  return Number.isFinite(amount) && amount > 0;
};

const toDraft = (playerId: string): BidDraft => ({
  playerId,
  amountInput: "",
  dirty: false,
});

export const bidDraftOf = (state: BidDraftState): BidDraft | null => state.draft;

const onSelectionWhileFocused = (
  draft: BidDraft,
  playerId: string | null,
): BidDraftState => {
  if (playerId === draft.playerId) {
    // Re-toggling the same player leaves the draft alone (selection is a
    // toggle; a re-select is not a change).
    return { _tag: "focused", draft };
  }
  if (draft.dirty) {
    // Selection changed with a dirty draft: keep the in-progress bid and ask
    // for an explicit discard decision — no silent discard.
    return { _tag: "confirmDiscard", draft, pendingPlayerId: playerId };
  }
  return playerId === null
    ? BID_DRAFT_EMPTY
    : { _tag: "focused", draft: toDraft(playerId) };
};

export const reduceBidDraft = (
  state: BidDraftState,
  event: BidDraftEvent,
): BidDraftState => {
  switch (state._tag) {
    case "empty":
      switch (event._tag) {
        case "selectionChangedTo":
          return event.playerId === null
            ? state
            : { _tag: "focused", draft: toDraft(event.playerId) };
        case "amountChanged":
        case "submitted":
        case "savedReloaded":
        case "playerUnavailable":
        case "discardRequested":
        case "keepCurrent":
          return state;
      }
      break;
    case "focused":
      return reduceFocused(state.draft, event);
    case "confirmDiscard":
      return reduceConfirming(state, event);
  }
  return state;
};

const reduceFocused = (draft: BidDraft, event: BidDraftEvent): BidDraftState => {
  switch (event._tag) {
    case "selectionChangedTo":
      return onSelectionWhileFocused(draft, event.playerId);
    case "amountChanged":
      return {
        _tag: "focused",
        draft: { ...draft, amountInput: event.value, dirty: event.value.trim() !== "" },
      };
    case "submitted":
    case "savedReloaded":
    case "playerUnavailable":
      return BID_DRAFT_EMPTY;
    case "discardRequested":
    case "keepCurrent":
      return { _tag: "focused", draft };
  }
  return { _tag: "focused", draft };
};

const reduceConfirming = (
  state: Extract<BidDraftState, { _tag: "confirmDiscard" }>,
  event: BidDraftEvent,
): BidDraftState => {
  switch (event._tag) {
    case "selectionChangedTo":
      if (event.playerId === state.draft.playerId) {
        // User re-selected the drafted player — the confirm is moot.
        return { _tag: "focused", draft: state.draft };
      }
      return { ...state, pendingPlayerId: event.playerId };
    case "amountChanged":
      return {
        ...state,
        draft: { ...state.draft, amountInput: event.value, dirty: event.value.trim() !== "" },
      };
    case "discardRequested":
      return state.pendingPlayerId === null
        ? BID_DRAFT_EMPTY
        : { _tag: "focused", draft: toDraft(state.pendingPlayerId) };
    case "keepCurrent":
      return { _tag: "focused", draft: state.draft };
    case "submitted":
    case "savedReloaded":
    case "playerUnavailable":
      return BID_DRAFT_EMPTY;
  }
  return state;
};