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
import { useRef, useState } from "react";
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

export type { CounterState } from "./useBidDraft.js";
export type { SelectedPlayer } from "./useTransferTables.js";

type TransferError = RpcClientError<"getTransfersScreen">;

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
  readonly windowOpen: boolean;
  readonly draft: BidDraft | null;
  readonly draftedPlayer: MarketPlayerRow | null;
  readonly draftedPlayerName: string;
  readonly draftAmount: number;
  readonly draftAmountValid: boolean;
  readonly counterAmountValid: boolean;
  readonly viewError: TransferError | null;
  readonly view: TransfersScreenView | undefined;
}

/** Commands siblings raise against the shared transfers state. */
export interface TransfersScreenActions {
  readonly setSelected: (next: SelectedPlayer | null) => void;
  /** Advance the bid draft by one event, reduced against the live draft. Keeps
   *  the draft ref module-internal so no leaf has to hold a mutable ref. */
  readonly updateDraft: (event: BidDraftEvent) => void;
  readonly setCounter: (next: CounterState | null) => void;
  readonly setCounterAmount: (next: string) => void;
  readonly setCounterError: (next: string | null) => void;
  readonly setFiltersFor: (key: TableId, next: readonly FilterClause[]) => void;
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
  // the current wire payload through this ref, never a load-time closure.
  const viewResultRef = useRef(viewResult);
  viewResultRef.current = viewResult;

  // --- session-scoped per-table interaction state: sort/filters/focus
  //  bookmark survive navigation; selection + draft are cleared.
  const initialMarket = useRef(readTableSession(MARKET));
  const initialFree = useRef(readTableSession(FREE));
  const marketSeed = useRef({
    sort: initialMarket.current?.sort ?? null,
    filters: initialMarket.current?.filters ?? [],
    activeId: initialMarket.current?.focusBookmark?.itemId ?? null,
    bookmark: initialMarket.current?.focusBookmark ?? null,
  });
  const freeSeed = useRef({
    sort: initialFree.current?.sort ?? null,
    filters: initialFree.current?.filters ?? [],
    activeId: initialFree.current?.focusBookmark?.itemId ?? null,
    bookmark: initialFree.current?.focusBookmark ?? null,
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
  } = useTransferTableState(marketSeed.current, freeSeed.current);

  // Live row-set refs for the stable palette handlers (announcement counts).
  const marketRowsRef = useRef<readonly MarketPlayerRow[]>([]);
  const freeAgentRowsRef = useRef<readonly MarketPlayerRow[]>([]);

  const [selected, setSelected] = useState<SelectedPlayer | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

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
  marketRowsRef.current = marketRows;
  freeAgentRowsRef.current = freeAgentRows;

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
    amountInputRef,
    marketIdsRef,
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
    speak,
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
      windowOpen,
      draft,
      draftedPlayer,
      draftedPlayerName,
      draftAmount,
      draftAmountValid,
      counterAmountValid,
      viewError,
      view,
    },
    actions: {
      setSelected,
      updateDraft,
      setCounter,
      setCounterAmount,
      setCounterError,
      setFiltersFor,
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
      speak,
      findPlayer,
    },
  };
};
