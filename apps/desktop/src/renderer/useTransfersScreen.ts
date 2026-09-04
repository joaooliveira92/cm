/**
 * Transfers screen (ticket 19, Stage 5 — level-3 grid). Market and Free Agents
 * adopt TanStack tables with row-roving, sortable headers, visible + palette
 * filtering, and identity-based focus restoration; bid entry lives in a single
 * contextual Actions region behind the dirty-draft lifecycle (no silent
 * discard); the incoming/outgoing bid tables stay hand-rendered; the native
 * `prompt()` counter-offer path is replaced by an inline modal (ticket 04).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { BidId, PlayerId, RpcPayload, SaveId, TransfersScreenView } from "@cm-clone/contracts";
import { Option } from "effect";
import { registerActionHandler } from "./actions/dispatch.js";
import { focusIdOf, focusSemanticTarget } from "./focus.js";
import { type RpcClientError } from "./rpc/errors.js";
import {
  AsyncResult,
  describeRpcError,
  placeBidMutation,
  respondAsBidderMutation,
  respondToBidMutation,
  signFreeAgentMutation,
  transfersAtom,
  typedError,
  useAtomRefresh,
  useAtomSet,
  useAtomValue,
} from "./rpc.js";
import { useTransferTableState } from "./table/transfers/useTransferTableState.js";
import {
  FREE_AGENT_PALETTE_OPTIONS,
  MARKET_PALETTE_OPTIONS,
  tableSortAndFilterActions,
} from "./table/paletteActions.js";
import {
  MARKET_COLUMN_LABELS,
  marketPlayerColumns,
  marketPlayerRowOf,
  type MarketPlayerRow,
} from "./table/transfers/marketColumns.js";
import { freeAgentColumns } from "./table/transfers/freeAgentColumns.js";
import { useDataTable, visibleRowIds } from "./table/useDataTable.js";
import { classifyTableParamAction } from "./table/paramActions.js";
import { sortDirectionOf } from "./table/features/sorting.js";
import { applyFilters, upsertFilter } from "./table/features/filtering.js";
import {
  BID_DRAFT_EMPTY,
  isValidBidAmount,
  reduceBidDraft,
  type BidDraft,
  type BidDraftState,
} from "./table/bidDraft.js";
import {
  discardSelectionForNavigation,
  readTableSession,
  type TableSessionState,
} from "./table/tableState.js";
import type { FilterClause, RefreshState, SortState, TableId } from "./table/types.js";
import {
  makeTableFocusBookmark,
  resolveTableFocus,
  type TableFocusBookmark,
} from "./table/focusBookmark.js";
import { deriveRefreshState } from "./table/viewState.js";

const MARKET = "transfer-market";
const FREE = "free-agents";

export interface SelectedPlayer {
  readonly tableId: TableId;
  readonly player: MarketPlayerRow;
}

export interface CounterState {
  readonly bidId: BidId;
  readonly playerName: string;
  readonly biddingClubName: string;
  readonly amount: number;
}

type TransferError = RpcClientError<"getTransfersScreen">;
type TransfersResult = AsyncResult.AsyncResult<TransfersScreenView, TransferError>;
type PerTableState = ReturnType<typeof useTransferTableState>["market"];

export interface TransfersScreenState {
  readonly viewResult: TransfersResult;
  readonly refresh: () => void;
  readonly status: string | null;
  readonly bidAlert: string | null;
  readonly selected: SelectedPlayer | null;
  readonly setSelected: (next: SelectedPlayer | null) => void;
  readonly draftState: BidDraftState;
  readonly draftRef: React.MutableRefObject<BidDraftState>;
  readonly setDraft: (next: BidDraftState) => void;
  readonly counters: CounterState | null;
  readonly counterAmount: string;
  readonly counterError: string | null;
  readonly setCounter: (next: CounterState | null) => void;
  readonly setCounterAmount: (next: string) => void;
  readonly setCounterError: (next: string | null) => void;
  readonly market: PerTableState;
  readonly free: PerTableState;
  readonly marketRowsRef: React.MutableRefObject<readonly MarketPlayerRow[]>;
  readonly freeAgentRowsRef: React.MutableRefObject<readonly MarketPlayerRow[]>;
  readonly marketRows: readonly MarketPlayerRow[];
  readonly freeAgentRows: readonly MarketPlayerRow[];
  readonly marketFiltered: readonly MarketPlayerRow[];
  readonly freeFiltered: readonly MarketPlayerRow[];
  readonly marketIdsRef: React.MutableRefObject<readonly string[]>;
  readonly freeIdsRef: React.MutableRefObject<readonly string[]>;
  readonly marketActiveRef: React.MutableRefObject<string | null>;
  readonly freeActiveRef: React.MutableRefObject<string | null>;
  readonly marketIds: readonly string[];
  readonly freeIds: readonly string[];
  readonly datasetIds: readonly string[];
  readonly marketIdsKey: string;
  readonly freeIdsKey: string;
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
  readonly filtersFor: (key: TableId) => readonly FilterClause[];
  readonly setSortFor: (key: TableId, next: SortState | null) => void;
  readonly setFiltersFor: (key: TableId, next: readonly FilterClause[]) => void;
  readonly setActiveFor: (key: TableId, id: string) => void;
  readonly setBookmarkFor: (key: TableId, bookmark: TableFocusBookmark) => void;
  readonly recordBookmark: (key: TableId, ids: readonly string[], active: string | null) => void;
  readonly speak: (key: TableId, kind: string, message: string) => void;
  readonly update: (key: TableId, patch: Partial<TableSessionState>) => void;
  readonly selectedRef: React.MutableRefObject<SelectedPlayer | null>;
  readonly viewResultRef: React.MutableRefObject<TransfersResult>;
  readonly amountInputRef: React.MutableRefObject<HTMLInputElement | null>;
  readonly run: (label: string, write: () => Promise<unknown>) => Promise<void>;
  readonly findPlayer: (playerId: string) => MarketPlayerRow | null;
  readonly submitBid: (playerId: PlayerId, amount: number) => Promise<void>;
  readonly submitSign: (playerId: PlayerId) => Promise<void>;
  readonly onBid: (playerId: PlayerId, amount: number) => void;
  readonly onSignFreeAgent: (playerId: PlayerId) => void;
  readonly runRespond: (payload: RpcPayload<"respondToBid">) => Promise<unknown>;
  readonly onRespondToBid: (bidId: BidId, action: "accept" | "reject" | "counter") => void;
  readonly onRespondAsBidder: (bidId: BidId, action: "accept" | "withdraw") => void;
  readonly onSortChangeFor: (key: TableId) => (next: SortState | null) => void;
  readonly onToggleSelectionFor: (key: TableId) => (id: string) => void;
  readonly onActiveChangeFor: (key: TableId) => (id: string) => void;
  readonly onBookmarkChangeFor: (key: TableId) => (bookmark: TableFocusBookmark) => void;
  readonly onRowPrimaryFor: (key: TableId) => (id: string) => void;
  readonly marketTableData: { rowIds: readonly string[] };
  readonly freeTableData: { rowIds: readonly string[] };
}

export const useTransfersScreen = (saveId: SaveId): TransfersScreenState => {
  const viewResult = useAtomValue(transfersAtom(saveId));
  const refresh = useAtomRefresh(transfersAtom(saveId));
  // Live view ref: the stable action handlers (registered once per saveId) read
  // the current wire payload through this ref, never a load-time closure.
  const viewResultRef = useRef(viewResult);
  viewResultRef.current = viewResult;

  const [status, setStatus] = useState<string | null>(null);
  const [bidAlert, setBidAlert] = useState<string | null>(null);

  const runBid = useAtomSet(placeBidMutation, { mode: "promise" });
  const runSign = useAtomSet(signFreeAgentMutation, { mode: "promise" });
  const runRespond = useAtomSet(respondToBidMutation, { mode: "promise" });
  const runRespondAsBidder = useAtomSet(respondAsBidderMutation, { mode: "promise" });

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

  // --- the single Bid draft + its dirty-draft lifecycle.
  const [draftState, setDraftState] = useState<BidDraftState>(BID_DRAFT_EMPTY);
  const draftRef = useRef(draftState);
  draftRef.current = draftState;
  const setDraft = useCallback((next: BidDraftState) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  const [counters, setCounter] = useState<CounterState | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  /** Inline error state: surfaces a click/Enter on an empty counter-offer so it
   *  is never a silent no-op (the disabled-submit gate covers non-empty invalid). */
  const [counterError, setCounterError] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const run = useCallback(async (label: string, write: () => Promise<unknown>) => {
    setStatus(`${label}...`);
    try {
      await write();
      setStatus(`${label}: done.`);
    } catch (error) {
      setStatus(`${label}: failed. ${describeRpcError(error as Parameters<typeof describeRpcError>[0])}`);
      throw error;
    }
  }, []);

  const findPlayer = useCallback(
    (playerId: string): MarketPlayerRow | null => {
      const available = Option.getOrUndefined(AsyncResult.value(viewResult));
      if (available === undefined) return null;
      const all = [
        ...available.marketPlayers.map(marketPlayerRowOf),
        ...available.freeAgents.map(marketPlayerRowOf),
      ];
      return all.find((p) => p.id === playerId) ?? null;
    },
    [viewResult],
  );

  const selectionChange = useCallback(
    (tableId: TableId, playerId: string | null): void => {
      setDraft(reduceBidDraft(draftRef.current, { _tag: "selectionChangedTo", playerId }));
    },
    [setDraft],
  );

  const submitBid = useCallback(
    async (playerId: PlayerId, amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) {
        setBidAlert("Enter a valid bid amount.");
        return;
      }
      const player = findPlayer(String(playerId));
      const name = player !== null ? `${player.firstName} ${player.lastName}` : String(playerId);
      const targetTable = selectedRef.current?.tableId ?? MARKET;
      setBidAlert(null);
      try {
        await run("Bid", () => runBid({ saveId, playerId, amount }));
        setDraft(reduceBidDraft(draftRef.current, { _tag: "submitted" }));
        selectionChange(targetTable, null);
        speak(targetTable, "bid-placed", `Bid placed for ${name}.`);
      } catch (error) {
        const message =
          typeof error === "object" && error !== null && "_tag" in error
            ? describeRpcError(error as Parameters<typeof describeRpcError>[0])
            : "The bid could not be placed.";
        setBidAlert(message);
      }
    },
    [findPlayer, run, runBid, saveId, setDraft, selectionChange, speak],
  );

  const submitSign = useCallback(
    async (playerId: PlayerId) => {
      const player = findPlayer(String(playerId));
      const name = player !== null ? `${player.firstName} ${player.lastName}` : String(playerId);
      const targetTable = selectedRef.current?.tableId ?? FREE;
      setBidAlert(null);
      try {
        await run("Sign", () => runSign({ saveId, playerId }));
        setDraft(reduceBidDraft(draftRef.current, { _tag: "submitted" }));
        selectionChange(targetTable, null);
        speak(targetTable, "signed", `Signed ${name}.`);
      } catch (error) {
        const message =
          typeof error === "object" && error !== null && "_tag" in error
            ? describeRpcError(error as Parameters<typeof describeRpcError>[0])
            : "The signing could not be completed.";
        setBidAlert(message);
      }
    },
    [findPlayer, run, runSign, saveId, setDraft, selectionChange, speak],
  );

  const onBid = useCallback(
    (playerId: PlayerId, amount: number) => void submitBid(playerId, amount),
    [submitBid],
  );
  const onSignFreeAgent = useCallback(
    (playerId: PlayerId) => void submitSign(playerId),
    [submitSign],
  );

  const onRespondToBid = useCallback(
    (bidId: BidId, action: "accept" | "reject" | "counter") => {
      if (action === "counter") {
        const current = viewResultRef.current;
        const bid = (current._tag === "Success" ? current.value : null)?.incomingBids.find(
          (b) => String(b.id) === String(bidId),
        );
        if (bid === undefined) return;
        setCounter({
          bidId,
          playerName: bid.playerName,
          biddingClubName: bid.biddingClubName,
          amount: bid.amount,
        });
        setCounterAmount("");
        setCounterError(null);
        return;
      }
      void run(action === "accept" ? "Accept" : "Reject", () =>
        runRespond({ saveId, bidId, action }),
      );
    },
    [run, runRespond, saveId],
  );

  const onRespondAsBidder = useCallback(
    (bidId: BidId, action: "accept" | "withdraw") =>
      run(action === "accept" ? "Accept counter" : "Withdraw", () =>
        runRespondAsBidder({ saveId, bidId, action }),
      ),
    [run, runRespondAsBidder, saveId],
  );

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

  // Latest-order refs for the stable live handlers and sort setters (written
  // after the TanStack instances derive their row ids each render).
  const marketIdsRef = useRef<readonly string[]>([]);
  const freeIdsRef = useRef<readonly string[]>([]);
  const marketActiveRef = useRef<string | null>(null);
  const freeActiveRef = useRef<string | null>(null);

  const marketFiltered = applyFilters(marketRows, market.filters);
  const freeFiltered = applyFilters(freeAgentRows, free.filters);

  const marketTableData = useTableDataFor(
    MARKET,
    marketPlayerColumns(),
    marketFiltered,
    market.sort,
    (next) => setSortFor(MARKET, next),
  );
  const freeTableData = useTableDataFor(
    FREE,
    freeAgentColumns(),
    freeFiltered,
    free.sort,
    (next) => setSortFor(FREE, next),
  );

  const marketIds = marketTableData.rowIds;
  const freeIds = freeTableData.rowIds;
  marketIdsRef.current = marketIds;
  freeIdsRef.current = freeIds;
  marketActiveRef.current = market.active;
  freeActiveRef.current = free.active;
  const datasetKey = datasetIds.join(",");
  const marketIdsKey = marketIds.join(",");
  const freeIdsKey = freeIds.join(",");

  const onSortChangeFor = useCallback(
    (key: TableId) => (next: SortState | null) => {
      const ids = key === MARKET ? marketIdsRef.current : freeIdsRef.current;
      recordBookmark(key, ids, activeFor(key));
      setSortFor(key, next);
      if (next === null) {
        speak(key, "sort-cleared", `Cleared the ${key === MARKET ? "Market" : "Free Agents"} sort.`);
      } else {
        speak(
          key,
          "sort-set",
          `Sorted by ${MARKET_COLUMN_LABELS[next.columnId] ?? next.columnId}, ${sortDirectionOf(next.direction)}.`,
        );
      }
    },
    [recordBookmark, setSortFor, activeFor, speak],
  );

  const onToggleSelectionFor = useCallback(
    (key: TableId) => (id: string) => {
      const rows = key === MARKET ? marketRows : freeAgentRows;
      const player = rows.find((p) => p.id === id);
      const name = player !== undefined ? `${player.firstName} ${player.lastName}` : id;
      if (selectedRef.current?.player.id === id) {
        setSelected(null);
        selectionChange(key, null);
        speak(key, "selection", `Deselected ${name}.`);
      } else if (player !== undefined) {
        setSelected({ tableId: key, player });
        selectionChange(key, id);
        speak(key, "selection", `Selected ${name}.`);
      }
    },
    [marketRows, freeAgentRows, selectionChange, speak],
  );

  const onActiveChangeFor = useCallback(
    (key: TableId) => (id: string) => {
      const ids = key === MARKET ? marketIdsRef.current : freeIdsRef.current;
      const bookmark = makeTableFocusBookmark(key, ids, id);
      setActiveFor(key, id);
      if (bookmark !== null) {
        setBookmarkFor(key, bookmark);
        update(key, { focusBookmark: bookmark });
      }
    },
    [marketIdsRef, freeIdsRef, setActiveFor, setBookmarkFor, update],
  );

  const onBookmarkChangeFor = useCallback(
    (key: TableId) => (bookmark: TableFocusBookmark) => {
      setBookmarkFor(key, bookmark);
      update(key, { focusBookmark: bookmark });
    },
    [setBookmarkFor, update],
  );

  const onRowPrimaryFor = useCallback(
    (key: TableId) => (id: string) => {
      const rows = key === MARKET ? marketRows : freeAgentRows;
      const player = rows.find((p) => p.id === id);
      if (player === undefined) return;
      if (selectedRef.current?.player.id !== id) {
        setSelected({ tableId: key, player });
        selectionChange(key, id);
        speak(key, "selection", `Selected ${player.firstName} ${player.lastName}.`);
      }
    },
    [marketRows, freeAgentRows, selectionChange, speak],
  );

  // --- selection cleared when the subject is filtered out or disappears;
  // unavailable → draft cleared + disabled + announced.
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

  useEffect(() => {
    return () => {
      discardSelectionForNavigation(MARKET);
      discardSelectionForNavigation(FREE);
    };
  }, []);

  useEffect(() => {
    setDraft(reduceBidDraft(draftRef.current, { _tag: "savedReloaded" }));
  }, [saveId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- focus restoration (AC-31): when a sort/filter/refetch removes the
  // focused row, restore by stable id with neighbour fallback. Resolves to
  // same → old next → old prev → first visible row → the screen primary.
  const focusRowFor = useCallback(
    (key: TableId, id: string): void => {
      const region = key === MARKET ? "marketTable" : "freeAgentTable";
      (
        document.querySelector(
          `[data-focus-id="${focusIdOf("transfers", region, id)}"]`,
        ) as HTMLElement | null
      )?.focus();
    },
    [],
  );

  const restoreFocusFor = useCallback(
    (
      key: TableId,
      active: string | null,
      bookmark: TableFocusBookmark | null,
      ids: readonly string[],
    ) => {
      if (viewResultRef.current.waiting === true) return;
      if (active === null || ids.includes(active)) return;
      const resolved = resolveTableFocus(
        bookmark !== null && bookmark.tableId === key ? bookmark : null,
        ids,
      );
      if (resolved !== null) {
        onActiveChangeFor(key)(resolved);
        focusRowFor(key, resolved);
      } else {
        focusSemanticTarget({ screen: "transfers" });
      }
    },
    [onActiveChangeFor, focusRowFor],
  );

  useEffect(() => {
    restoreFocusFor(MARKET, market.active, market.bookmark, marketIds);
  }, [marketIdsKey, viewResult.waiting, market.active, market.bookmark]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    restoreFocusFor(FREE, free.active, free.bookmark, freeIds);
  }, [freeIdsKey, viewResult.waiting, free.active, free.bookmark]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unregisters: Array<() => void> = [];

    const applyParam = (actionId: string, params: unknown): void => {
      const parsed = classifyTableParamAction(actionId, params);
      if (parsed === null) return;
      const marketish = parsed.tableId === MARKET || parsed.tableId === FREE;
      if (!marketish) return;
      if (parsed.tableId === MARKET) recordBookmark(MARKET, marketIdsRef.current, marketActiveRef.current);
      else recordBookmark(FREE, freeIdsRef.current, freeActiveRef.current);
      const labels = MARKET_COLUMN_LABELS;
      switch (parsed.kind) {
        case "set-sort": {
          const next = parsed.sort ?? null;
          setSortFor(parsed.tableId, next);
          if (next === null) {
            speak(parsed.tableId, "sort-cleared", `Cleared the ${parsed.tableId === MARKET ? "Market" : "Free Agents"} sort.`);
          } else {
            speak(
              parsed.tableId,
              "sort-set",
              `Sorted by ${labels[next.columnId] ?? next.columnId}, ${sortDirectionOf(next.direction)}.`,
            );
          }
          break;
        }
        case "clear-sort":
          setSortFor(parsed.tableId, null);
          speak(parsed.tableId, "sort-cleared", `Cleared the ${parsed.tableId === MARKET ? "Market" : "Free Agents"} sort.`);
          break;
        case "set-filter":
          if (parsed.filter !== undefined) {
            const rows =
              parsed.tableId === MARKET ? marketRowsRef.current : freeAgentRowsRef.current;
            const next = upsertFilter(filtersFor(parsed.tableId), parsed.filter);
            setFiltersFor(parsed.tableId, next);
            const count = applyFilters(rows, next).length;
            speak(
              parsed.tableId,
              "filter-set",
              `${count} ${count === 1 ? "player matches" : "players match"} the current filters.`,
            );
          }
          break;
        case "clear-filters":
          setFiltersFor(parsed.tableId, []);
          speak(parsed.tableId, "filter-cleared", `Cleared the ${parsed.tableId === MARKET ? "Market" : "Free Agents"} filters.`);
          break;
      }
    };

    const focusBidWorkflow = (): void => {
      if (draftRef.current.draft !== null) {
        amountInputRef.current?.focus();
        return;
      }
      const firstId = marketIdsRef.current[0];
      if (firstId !== undefined) {
        (
          document.querySelector(
            `[data-focus-id="${focusIdOf("transfers", "marketTable", firstId)}"]`,
          ) as HTMLElement | null
        )?.focus();
      }
    };

    unregisters.push(
      registerActionHandler("place-bid", (params) => {
        const p = params as { playerId: PlayerId; amount: number };
        void onBid(p.playerId, p.amount);
      }),
      registerActionHandler("sign-free-agent", (params) => {
        const p = params as { playerId: PlayerId };
        void onSignFreeAgent(p.playerId);
      }),
      registerActionHandler("respond-accept", (params) =>
        onRespondToBid((params as { bidId: BidId }).bidId, "accept"),
      ),
      registerActionHandler("respond-reject", (params) =>
        onRespondToBid((params as { bidId: BidId }).bidId, "reject"),
      ),
      registerActionHandler("respond-counter", (params) =>
        onRespondToBid((params as { bidId: BidId }).bidId, "counter"),
      ),
      registerActionHandler("accept-counter", (params) =>
        onRespondAsBidder((params as { bidId: BidId }).bidId, "accept"),
      ),
      registerActionHandler("withdraw-bid", (params) =>
        onRespondAsBidder((params as { bidId: BidId }).bidId, "withdraw"),
      ),
      registerActionHandler("focus-bid", focusBidWorkflow),
      registerActionHandler("retry-market-table", () => refresh()),
      registerActionHandler("retry-free-agents-table", () => refresh()),
    );
    for (const action of tableSortAndFilterActions(MARKET_PALETTE_OPTIONS)) {
      unregisters.push(registerActionHandler(action.id, (params: unknown) => applyParam(action.id, params)));
    }
    for (const action of tableSortAndFilterActions(FREE_AGENT_PALETTE_OPTIONS)) {
      unregisters.push(registerActionHandler(action.id, (params: unknown) => applyParam(action.id, params)));
    }
    return () => {
      for (const unregister of unregisters) unregister();
    };
    // Handlers read through refs.
  }, [saveId]); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = draftState.draft;
  const draftedPlayer = draft !== null ? findPlayer(draft.playerId) : null;
  const draftedPlayerName =
    draftedPlayer !== null ? `${draftedPlayer.firstName} ${draftedPlayer.lastName}` : "";
  const draftAmount = draft !== null ? Number(draft.amountInput) : 0;
  const draftAmountValid = draft !== null && isValidBidAmount(draft.amountInput);
  const counterAmountValid = isValidBidAmount(counterAmount);
  const windowOpen = view?.windowOpen ?? true;

  return {
    viewResult,
    refresh,
    status,
    bidAlert,
    selected,
    setSelected,
    draftState,
    draftRef,
    setDraft,
    counters,
    counterAmount,
    counterError,
    setCounter,
    setCounterAmount,
    setCounterError,
    market,
    free,
    marketRowsRef,
    freeAgentRowsRef,
    marketRows,
    freeAgentRows,
    marketFiltered,
    freeFiltered,
    marketIdsRef,
    freeIdsRef,
    marketActiveRef,
    freeActiveRef,
    marketIds,
    freeIds,
    datasetIds,
    marketIdsKey,
    freeIdsKey,
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
    filtersFor,
    setSortFor,
    setFiltersFor,
    setActiveFor,
    setBookmarkFor,
    recordBookmark,
    speak,
    update,
    selectedRef,
    viewResultRef,
    amountInputRef,
    run,
    findPlayer,
    runRespond,
    submitBid,
    submitSign,
    onBid,
    onSignFreeAgent,
    onRespondToBid,
    onRespondAsBidder,
    onSortChangeFor,
    onToggleSelectionFor,
    onActiveChangeFor,
    onBookmarkChangeFor,
    onRowPrimaryFor,
    marketTableData,
    freeTableData,
  };
};

const useTableDataFor = (
  tableId: TableId,
  columns: ReadonlyArray<ColumnDef<MarketPlayerRow, unknown>>,
  rows: ReadonlyArray<MarketPlayerRow>,
  sort: SortState | null,
  onSortChange: (sort: SortState | null) => void,
): { rowIds: readonly string[] } => {
  const table = useDataTable<MarketPlayerRow>({
    columns,
    data: rows,
    sort,
    onSortChange,
  });
  return { rowIds: visibleRowIds(table) };
};
