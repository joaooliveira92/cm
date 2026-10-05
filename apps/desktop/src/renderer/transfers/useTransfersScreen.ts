/**
 * Transfers screen (ticket 19, Stage 5 — level-3 grid). Market and Free Agents
 * adopt TanStack tables with row-roving, sortable headers, visible + palette
 * filtering, and identity-based focus restoration; bid entry lives in a single
 * contextual Actions region behind the dirty-draft lifecycle (no silent
 * discard); the incoming/outgoing bid tables stay hand-rendered; the native
 * `prompt()` counter-offer path is replaced by an inline modal (ticket 04).
 *
 * This file is assembly only: `useBidDraft`, `useTransferCommands` and
 * `useTransferTables` hold the three concerns. Their call order here reproduces
 * the order those blocks appeared in when they were one hook body, because the
 * ref writes and the TanStack instantiations interleave — see
 * `useTransferTables.ts`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { RpcPayload, SaveId, TransfersScreenView } from "@cm-clone/contracts";
import { Option } from "effect";
import { type RpcClientError } from "../rpc/errors.js";
import {
  AsyncResult,
  describeRpcError,
  transfersAtom,
  typedError,
  useAtomRefresh,
  useAtomValue,
} from "../rpc.js";
import { useTransferTableState } from "../table/transfers/useTransferTableState.js";
import {
  marketPlayerRowOf,
  type MarketPlayerRow,
} from "../table/transfers/marketColumns.js";
import { isValidBidAmount, type BidDraft, type BidDraftEvent, type BidDraftState } from "../table/bidDraft.js";
import { readTableSession } from "../table/tableState.js";
import type { FilterClause, RefreshState, SortState, TableId } from "../table/types.js";
import type { TableFocusBookmark } from "../table/focusBookmark.js";
import { deriveRefreshState } from "../table/viewState.js";
import { applyFilters, filterChangeNotice } from "../table/features/filtering.js";
import { FREE, MARKET } from "./tableIds.js";
import {
  useBidDraft,
  useClearDraftOnUnavailable,
  useResetDraftOnSaveChange,
  type CounterState,
} from "./useBidDraft.js";
import { useTransferCommandHandlers, useTransferCommands } from "./useTransferCommands.js";
import {
  useDiscardTableSelectionOnUnmount,
  useTransferTableFocusRestoration,
  useTransferTables,
  type PerTableState,
  type SelectedPlayer,
} from "./useTransferTables.js";
import { useTablePaletteHandlers } from "./useTransferPaletteActions.js";
import type { ContractTerms } from "./ContractOfferTerms.js";
import { consumeTransferTarget } from "./transferTarget.js";

export type { CounterState } from "./useBidDraft.js";
export type { SelectedPlayer } from "./useTransferTables.js";

type TransferError = RpcClientError<"getTransfersScreen">;

/** The screen's four tabs, one per table. */
export type TransfersTab = "incoming" | "outgoing" | "free-agents" | "market";

/** Data the transfers screen shows or holds. */
export interface TransfersScreenState {
  readonly status: string | null;
  readonly bidAlert: string | null;
  readonly selected: SelectedPlayer | null;
  readonly draftState: BidDraftState;
  readonly counters: CounterState | null;
  readonly counterAmount: string;
  readonly counterError: string | null;
  readonly market: PerTableState;
  readonly free: PerTableState;
  readonly marketRows: readonly MarketPlayerRow[];
  readonly freeAgentRows: readonly MarketPlayerRow[];
  readonly marketFiltered: readonly MarketPlayerRow[];
  readonly freeFiltered: readonly MarketPlayerRow[];
  readonly refreshState: RefreshState;
  readonly tab: TransfersTab;
  readonly windowOpen: boolean;
  readonly draft: BidDraft | null;
  readonly draftedPlayer: MarketPlayerRow | null;
  readonly draftedPlayerName: string;
  readonly draftAmount: number;
  readonly draftAmountValid: boolean;
  readonly counterAmountValid: boolean;
  readonly viewError: TransferError | null;
  readonly view: TransfersScreenView | undefined;
  /** What the last sort or filter command did, for the shell's bottom bar (the Squad's rule). */
  readonly barNotice: string | null;
}

/** Commands siblings raise against the shared transfers state. */
export interface TransfersScreenActions {
  readonly setSelected: (next: SelectedPlayer | null) => void;
  readonly setTab: (next: TransfersTab) => void;
  /** Advance the bid draft by one event, reduced against the live draft. Keeps
   *  the draft ref module-internal so no leaf has to hold a mutable ref. */
  readonly updateDraft: (event: BidDraftEvent) => void;
  readonly setCounter: (next: CounterState | null) => void;
  readonly setCounterAmount: (next: string) => void;
  readonly setCounterError: (next: string | null) => void;
  readonly setFiltersFor: (key: TableId, next: readonly FilterClause[]) => void;
  /** Set one table's filters and say in the bottom bar what changed and how many rows are left. */
  readonly applyFiltersFor: (key: TableId, next: readonly FilterClause[]) => void;
  readonly run: (label: string, write: () => Promise<unknown>) => Promise<void>;
  readonly runRespond: (payload: RpcPayload<"respondToBid">) => Promise<unknown>;
  readonly onSortChangeFor: (key: TableId) => (next: SortState | null) => void;
  readonly onToggleSelectionFor: (key: TableId) => (id: string) => void;
  readonly onActiveChangeFor: (key: TableId) => (id: string) => void;
  readonly onBookmarkChangeFor: (key: TableId) => (bookmark: TableFocusBookmark) => void;
  readonly onRowPrimaryFor: (key: TableId) => (id: string) => void;
}

/** Focus/announcement plumbing and the one ref the JSX must touch directly. */
export interface TransfersScreenMeta {
  readonly saveId: SaveId;
  readonly amountInputRef: React.MutableRefObject<HTMLInputElement | null>;
  /** The terms the Contract Offer form is currently showing, written by the form and read by the
   *  stable `sign-free-agent` Action handler — a palette dispatch signs the offer on screen rather
   *  than a second copy of the numbers. */
  readonly offerTermsRef: React.MutableRefObject<ContractTerms | null>;
  readonly speak: (key: TableId, kind: string, message: string) => void;
  readonly findPlayer: (playerId: string) => MarketPlayerRow | null;
}

export interface TransfersScreenValue {
  readonly state: TransfersScreenState;
  readonly actions: TransfersScreenActions;
  readonly meta: TransfersScreenMeta;
}

export const useTransfersScreen = (saveId: SaveId): TransfersScreenValue => {
  const viewResult = useAtomValue(transfersAtom(saveId));
  const refresh = useAtomRefresh(transfersAtom(saveId));
  // Live view ref: the stable action handlers (registered once per saveId) read
  // the current wire payload through this ref, never a load-time closure. Written after commit;
  // this writer is declared before every effect that reads it.
  const viewResultRef = useRef(viewResult);
  useEffect(() => {
    viewResultRef.current = viewResult;
  }, [viewResult]);

  // --- session-scoped per-table interaction state: sort/filters/focus
  //  bookmark survive navigation; selection + draft are cleared. Read once, through the lazy
  //  initializers, so `readTableSession` is not re-run on every render.
  const [marketSeed] = useState(() => {
    const initial = readTableSession(MARKET);
    return {
      sort: initial?.sort ?? null,
      filters: initial?.filters ?? [],
      activeId: initial?.focusBookmark?.itemId ?? null,
      bookmark: initial?.focusBookmark ?? null,
    };
  });
  const [freeSeed] = useState(() => {
    const initial = readTableSession(FREE);
    return {
      sort: initial?.sort ?? null,
      filters: initial?.filters ?? [],
      activeId: initial?.focusBookmark?.itemId ?? null,
      bookmark: initial?.focusBookmark ?? null,
    };
  });

  const {
    market,
    free,
    setSortFor,
    setFiltersFor,
    filtersFor,
    activeFor,
    setActiveFor,
    setBookmarkFor,
    recordBookmark,
    speak,
    update,
  } = useTransferTableState(marketSeed, freeSeed);

  // Live row-set refs for the stable palette handlers (announcement counts).
  const marketRowsRef = useRef<readonly MarketPlayerRow[]>([]);
  const freeAgentRowsRef = useRef<readonly MarketPlayerRow[]>([]);

  // Sort and filter commands report in the shell's bottom bar, not the table's announcer, as the
  // Squad's do; that bar line is itself a polite region. Row-level lines stay on `speak`.
  const [barNotice, setBarNotice] = useState<string | null>(null);
  const applyFiltersFor = useCallback(
    (key: TableId, next: readonly FilterClause[]) => {
      const before = filtersFor(key);
      setFiltersFor(key, next);
      const rows = key === MARKET ? marketRowsRef.current : freeAgentRowsRef.current;
      setBarNotice(filterChangeNotice(before, next, applyFilters(rows, next).length));
    },
    [filtersFor, setFiltersFor],
  );

  // Market first: the bid workflow starts there, and `focus-bid` lands on its first row.
  const [tab, setTabState] = useState<TransfersTab>("market");
  // A notice speaks for the tab that raised it ("Sorted by Age" on the Market), so it goes when
  // the tab does rather than sitting under a table it does not describe.
  const setTab = useCallback((next: TransfersTab) => {
    setTabState(next);
    setBarNotice(null);
  }, []);
  const [selected, setSelected] = useState<SelectedPlayer | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // One-shot: a Make Offer action from the Player Profile set a target player.
  // Stored in a ref so it survives until the view data loads.
  const pendingRef = useRef(consumeTransferTarget());

  /** The live terms of the Contract Offer on screen. The form writes it on every render, so the
   *  once-per-save Action handler can read the current offer without re-registering. */
  const offerTermsRef = useRef<ContractTerms | null>(null);

  const {
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
  } = useBidDraft();

  const {
    status,
    bidAlert,
    setBidAlert,
    run,
    runRespond,
    findPlayer,
    selectionChange,
    onBid,
    onSignFreeAgent,
    onRespondToBid,
    onRespondAsBidder,
  } = useTransferCommands({
    saveId,
    viewResult,
    viewResultRef,
    selectedRef,
    draftRef,
    setDraft,
    setCounter,
    setCounterAmount,
    setCounterError,
    speak,
  });

  const viewError = typedError(viewResult);
  const view = Option.getOrUndefined(AsyncResult.value(viewResult));
  const refreshState = deriveRefreshState({
    waiting: viewResult.waiting === true && view !== undefined,
    refreshFailed:
      viewError !== null && view !== undefined
        ? { message: describeRpcError(viewError) }
        : null,
  });
  const marketRows = view !== undefined ? view.marketPlayers.map(marketPlayerRowOf) : [];
  const freeAgentRows = view !== undefined ? view.freeAgents.map(marketPlayerRowOf) : [];
  const datasetIds = [...marketRows, ...freeAgentRows].map((p) => p.id);
  // Live row-set refs for the stable palette handlers (announcement counts), written after commit.
  useEffect(() => {
    marketRowsRef.current = marketRows;
    freeAgentRowsRef.current = freeAgentRows;
  }, [marketRows, freeAgentRows]);

  // One-shot: a Make Offer action from the Player Profile set a target player. After rows are
  // loaded, select the player and switch to the right tab. Run after commit, guarded on the
  // one-shot pending marker, so no state is derived during render.
  useEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    if (view === undefined || marketRows.length + freeAgentRows.length === 0) return;
    pendingRef.current = null;
    const marketRow = marketRows.find((r) => r.id === String(pending.playerId));
    if (marketRow !== undefined) {
      setSelected({ tableId: MARKET, player: marketRow });
      return;
    }
    const freeRow = freeAgentRows.find((r) => r.id === String(pending.playerId));
    if (freeRow !== undefined) {
      setTabState("free-agents");
      setSelected({ tableId: FREE, player: freeRow });
    }
  }, [view, marketRows, freeAgentRows]);

  const {
    marketFiltered,
    freeFiltered,
    marketIds,
    freeIds,
    marketIdsKey,
    freeIdsKey,
    marketIdsRef,
    freeIdsRef,
    marketActiveRef,
    freeActiveRef,
    onSortChangeFor,
    onToggleSelectionFor,
    onActiveChangeFor,
    onBookmarkChangeFor,
    onRowPrimaryFor,
  } = useTransferTables({
    market,
    free,
    marketRows,
    freeAgentRows,
    selectedRef,
    setSelected,
    selectionChange,
    setSortFor,
    recordBookmark,
    activeFor,
    setActiveFor,
    setBookmarkFor,
    update,
    speak,
    notify: setBarNotice,
  });

  const datasetKey = datasetIds.join(",");

  useClearDraftOnUnavailable({
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
  });

  useDiscardTableSelectionOnUnmount();

  useResetDraftOnSaveChange(saveId, draftRef, setDraft);

  useTransferTableFocusRestoration({
    viewResultRef,
    viewWaiting: viewResult.waiting,
    market,
    free,
    marketIds,
    freeIds,
    marketIdsKey,
    freeIdsKey,
    onActiveChangeFor,
  });

  useTransferCommandHandlers({
    saveId,
    draftRef,
    offerTermsRef,
    amountInputRef,
    marketIdsRef,
    showMarket: () => setTab("market"),
    refresh,
    onBid,
    onSignFreeAgent,
    onRespondToBid,
    onRespondAsBidder,
  });

  useTablePaletteHandlers({
    saveId,
    marketIdsRef,
    freeIdsRef,
    marketActiveRef,
    freeActiveRef,
    marketRowsRef,
    freeAgentRowsRef,
    recordBookmark,
    setSortFor,
    setFiltersFor,
    filtersFor,
    notify: setBarNotice,
  });

  const draft = draftState.draft;
  const draftedPlayer = draft !== null ? findPlayer(draft.playerId) : null;
  const draftedPlayerName =
    draftedPlayer !== null ? `${draftedPlayer.firstName} ${draftedPlayer.lastName}` : "";
  const draftAmount = draft !== null ? Number(draft.amountInput) : 0;
  const draftAmountValid = draft !== null && isValidBidAmount(draft.amountInput);
  const counterAmountValid = isValidBidAmount(counterAmount);
  const windowOpen = view?.windowOpen ?? true;

  return {
    state: {
      status,
      bidAlert,
      selected,
      draftState,
      counters,
      counterAmount,
      counterError,
      market,
      free,
      marketRows,
      freeAgentRows,
      marketFiltered,
      freeFiltered,
      refreshState,
      tab,
      windowOpen,
      draft,
      draftedPlayer,
      draftedPlayerName,
      draftAmount,
      draftAmountValid,
      counterAmountValid,
      viewError,
      view,
      barNotice,
    },
    actions: {
      setSelected,
      setTab,
      updateDraft,
      setCounter,
      setCounterAmount,
      setCounterError,
      setFiltersFor,
      applyFiltersFor,
      run,
      runRespond,
      onSortChangeFor,
      onToggleSelectionFor,
      onActiveChangeFor,
      onBookmarkChangeFor,
      onRowPrimaryFor,
    },
    meta: {
      saveId,
      amountInputRef,
      offerTermsRef,
      speak,
      findPlayer,
    },
  };
};
