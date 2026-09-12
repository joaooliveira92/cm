/**
 * The Transfers screen's single Bid draft: the draft reducer handle, the
 * counter-offer trio, the amount input ref, and the two lifecycle effects that
 * clear or reset the draft.
 *
 * The lifecycle effects are exported separately from the state hook because the
 * assembly calls them at the point in its render where they appear today — they
 * read the table row-id refs, which are only populated after the TanStack
 * instances have derived their row ids. Hook call order in the assembly is
 * load-bearing; see `useTransfersScreen.ts`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { BidId, SaveId } from "@cm-clone/contracts";
import type { TableId } from "../table/types.js";
import { MARKET } from "./tableIds.js";
import {
  BID_DRAFT_EMPTY,
  reduceBidDraft,
  type BidDraftEvent,
  type BidDraftState,
} from "../table/bidDraft.js";

export interface CounterState {
  readonly bidId: BidId;
  readonly playerName: string;
  readonly biddingClubName: string;
  readonly amount: number;
}

export interface BidDraftValue {
  readonly draftState: BidDraftState;
  readonly draftRef: React.MutableRefObject<BidDraftState>;
  readonly setDraft: (next: BidDraftState) => void;
  readonly updateDraft: (event: BidDraftEvent) => void;
  readonly counters: CounterState | null;
  readonly setCounter: React.Dispatch<React.SetStateAction<CounterState | null>>;
  readonly counterAmount: string;
  readonly setCounterAmount: React.Dispatch<React.SetStateAction<string>>;
  readonly counterError: string | null;
  readonly setCounterError: React.Dispatch<React.SetStateAction<string | null>>;
  readonly amountInputRef: React.MutableRefObject<HTMLInputElement | null>;
}

/** The single Bid draft + its dirty-draft lifecycle. */
export const useBidDraft = (): BidDraftValue => {
  const [draftState, setDraftState] = useState<BidDraftState>(BID_DRAFT_EMPTY);
  const draftRef = useRef(draftState);
  draftRef.current = draftState;
  const setDraft = useCallback((next: BidDraftState) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);
  const updateDraft = useCallback(
    (event: BidDraftEvent) => {
      setDraft(reduceBidDraft(draftRef.current, event));
    },
    [setDraft],
  );

  const [counters, setCounter] = useState<CounterState | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  /** Inline error state: surfaces a click/Enter on an empty counter-offer so it
   *  is never a silent no-op (the disabled-submit gate covers non-empty invalid). */
  const [counterError, setCounterError] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  return {
    draftState,
    draftRef,
    setDraft,
    updateDraft,
    counters,
    setCounter,
    counterAmount,
    setCounterAmount,
    counterError,
    setCounterError,
    amountInputRef,
  };
};

export interface ClearDraftOnUnavailableParams {
  readonly selectedRef: React.MutableRefObject<{ readonly tableId: TableId; readonly player: { readonly id: string } } | null>;
  readonly marketIdsRef: React.MutableRefObject<readonly string[]>;
  readonly freeIdsRef: React.MutableRefObject<readonly string[]>;
  readonly draftRef: React.MutableRefObject<BidDraftState>;
  readonly datasetIds: readonly string[];
  readonly datasetKey: string;
  readonly marketIdsKey: string;
  readonly freeIdsKey: string;
  readonly setDraft: (next: BidDraftState) => void;
  readonly setSelected: (next: null) => void;
  readonly setBidAlert: (next: string | null) => void;
  readonly speak: (key: TableId, kind: string, message: string) => void;
}

/**
 * Selection cleared when the subject is filtered out or disappears;
 * unavailable → draft cleared + disabled + announced.
 */
export const useClearDraftOnUnavailable = ({
  selectedRef,
  marketIdsRef,
  freeIdsRef,
  draftRef,
  datasetIds,
  datasetKey,
  marketIdsKey,
  freeIdsKey,
  setDraft,
  setSelected,
  setBidAlert,
  speak,
}: ClearDraftOnUnavailableParams): void => {
  useEffect(() => {
    const current = selectedRef.current;
    if (current === null) return;
    const visibleIds = current.tableId === MARKET ? marketIdsRef.current : freeIdsRef.current;
    if (!datasetIds.includes(current.player.id)) {
      setDraft(reduceBidDraft(draftRef.current, { _tag: "playerUnavailable" }));
      setSelected(null);
      setBidAlert("The selected player is no longer available for a bid.");
      speak(current.tableId, "player-unavailable", "The selected player is no longer available.");
      return;
    }
    if (!visibleIds.includes(current.player.id)) {
      setDraft(reduceBidDraft(draftRef.current, { _tag: "selectionChangedTo", playerId: null }));
      setSelected(null);
      setBidAlert(null);
      speak(current.tableId, "selection-hidden", "The selected player is hidden by the current filters.");
    }
  }, [datasetKey, marketIdsKey, freeIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps
};

/** A different save is a different market: the draft starts empty again. */
export const useResetDraftOnSaveChange = (
  saveId: SaveId,
  draftRef: React.MutableRefObject<BidDraftState>,
  setDraft: (next: BidDraftState) => void,
): void => {
  useEffect(() => {
    setDraft(reduceBidDraft(draftRef.current, { _tag: "savedReloaded" }));
  }, [saveId]); // eslint-disable-line react-hooks/exhaustive-deps
};
