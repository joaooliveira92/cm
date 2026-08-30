/**
 * Transfers screen (ticket 19, Stage 5 — level-3 grid). Market and Free Agents
 * adopt TanStack tables with row-roving, sortable headers, visible + palette
 * filtering, and identity-based focus restoration; bid entry lives in a single
 * contextual Actions region behind the dirty-draft lifecycle (no silent
 * discard); the incoming/outgoing bid tables stay hand-rendered; the native
 * `prompt()` counter-offer path is replaced by an inline modal (ticket 04).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { BidId, PlayerId, SaveId } from "@cm-clone/contracts";
import { Option } from "effect";
import { ACTION_REGISTRY } from "./actions/allActions.js";
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { focusIdOf, FOCUS_RING, focusSemanticTarget, restoreFocusAfterOverlay } from "./focus.js";
import { ActionKeyBadge, actionBadgeBinding } from "./discoverability/ActionKeyBadge.js";
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
import { InlineModal } from "./transfers/InlineModal.js";
import { useDialogKeyboard } from "./transfers/dialogKeyboard.js";
import {
  FREE_AGENT_PALETTE_OPTIONS,
  MARKET_PALETTE_OPTIONS,
  tableSortAndFilterActions,
} from "./table/paletteActions.js";
import { MARKET_COLUMN_LABELS, marketPlayerColumns, marketPlayerRowOf, type MarketPlayerRow } from "./table/transfers/marketColumns.js";
import { freeAgentColumns } from "./table/transfers/freeAgentColumns.js";
import { TablePanel } from "./table/TablePanel.js";
import { useDataTable, visibleRowIds } from "./table/useDataTable.js";
import { classifyTableParamAction } from "./table/paramActions.js";
import { sortDirectionOf } from "./table/features/sorting.js";
import { applyFilters, upsertFilter } from "./table/features/filtering.js";
import {
  BID_DRAFT_EMPTY,
  isValidBidAmount,
  reduceBidDraft,
  type BidDraftState,
} from "./table/bidDraft.js";
import {
  discardSelectionForNavigation,
  readTableSession,
  updateTableSession,
} from "./table/tableState.js";
import {
  makeTableFocusBookmark,
  resolveTableFocus,
  type TableFocusBookmark,
} from "./table/focusBookmark.js";
import { announce } from "./table/announcement.js";
import { deriveRefreshState, STATE_COPY } from "./table/viewState.js";
import type { FilterClause, SortState, TableAnnouncement, TableId } from "./table/types.js";

const formatCredits = (amount: number): string => `${amount.toLocaleString()} Cr`;

const MARKET = "transfer-market";
const FREE = "free-agents";

/** The dirty-draft Keep/Discard dialog (no-silent-discard lifecycle, note
 *  AC-29). Owns its keyboard the moment it opens: initial focus on Keep, Tab
 *  trapped inside, Escape = keep-current/close. Focus is returned to the
 *  invoking row control on close (the Keep path restores explicitly via the
 *  focus coordinator); the Discard path hands focus to the bid input instead. */
const KeepDiscardDialog = ({
  playerName,
  onKeep,
  onDiscard,
}: {
  readonly playerName: string;
  readonly onKeep: () => void;
  readonly onDiscard: () => void;
}) => {
  const keepRef = useRef<HTMLButtonElement | null>(null);
  // restoreOnClose is false: Keep restores to the invoking control explicitly
  // (the refocused row), while Discard deliberately leaves focus on the bid
  // input — an unmount cleanup must never clobber either target.
  const { containerRef, onKeyDown } = useDialogKeyboard({
    initialFocus: () => keepRef.current,
    onEscape: () => {
      onKeep();
    },
    restoreOnClose: false,
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Discard the bid in progress?"
        onKeyDown={onKeyDown}
        className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl"
      >
        <h2 className="text-lg font-semibold">Discard the bid in progress?</h2>
        <p className="mt-1 text-sm text-slate-400">
          You typed an amount for {playerName}. Moving away would lose this bid
          unless you keep it.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={keepRef}
            type="button"
            className={`rounded bg-slate-700 px-3 py-1 text-sm ${FOCUS_RING.join(" ")}`}
            onClick={onKeep}
          >
            Keep bid
          </button>
          <button
            type="button"
            className={`rounded bg-amber-600 px-3 py-1 text-sm text-slate-950 ${FOCUS_RING.join(" ")}`}
            onClick={onDiscard}
          >
            Discard draft
          </button>
        </div>
      </div>
    </div>
  );
};

interface SelectedPlayer {
  readonly tableId: TableId;
  readonly player: MarketPlayerRow;
}

export const TransfersScreen = ({ saveId }: { readonly saveId: SaveId }) => {
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

  // --- session-scoped per-table interaction state (sort/filters/bookmark/scroll
  // survive navigation; selection + draft are cleared).
  const initialMarket = useRef(readTableSession(MARKET));
  const initialFree = useRef(readTableSession(FREE));
  const mk = (key: TableId): { read: () => { sort: SortState | null; filters: readonly FilterClause[]; bookmark: TableFocusBookmark | null; activeId: string | null; scrollLeft: number } } => ({
    read: () => {
      const session =
        key === MARKET ? initialMarket.current : key === FREE ? initialFree.current : null;
      return {
        sort: session?.sort ?? null,
        filters: session?.filters ?? [],
        bookmark: session?.focusBookmark ?? null,
        activeId: session?.focusBookmark?.itemId ?? null,
        scrollLeft: session?.scrollLeft ?? 0,
      };
    },
  });

  const marketSeed = useRef(mk(MARKET).read());
  const freeSeed = useRef(mk(FREE).read());

  const [marketSort, setMarketSortState] = useState<SortState | null>(marketSeed.current.sort);
  const [marketFilters, setMarketFiltersState] = useState<readonly FilterClause[]>(marketSeed.current.filters);
  const [marketActive, setMarketActiveState] = useState<string | null>(marketSeed.current.activeId);
  const [marketBookmark, setMarketBookmarkState] = useState<TableFocusBookmark | null>(marketSeed.current.bookmark);

  const [freeSort, setFreeSortState] = useState<SortState | null>(freeSeed.current.sort);
  const [freeFilters, setFreeFiltersState] = useState<readonly FilterClause[]>(freeSeed.current.filters);
  const [freeActive, setFreeActiveState] = useState<string | null>(freeSeed.current.activeId);
  const [freeBookmark, setFreeBookmarkState] = useState<TableFocusBookmark | null>(freeSeed.current.bookmark);

  // Live row-set refs for the stable palette handlers (announcement counts).
  const marketRowsRef = useRef<readonly MarketPlayerRow[]>([]);
  const freeAgentRowsRef = useRef<readonly MarketPlayerRow[]>([]);

  // Shared selection: Market and Free Agents are one market with one subject.
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

  const [counters, setCounter] = useState<{
    readonly bidId: BidId;
    readonly playerName: string;
    readonly biddingClubName: string;
    readonly amount: number;
  } | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  /** Inline error state: set when the submit is clicked with an invalid (incl.
   *  empty) counter-offer — the disabled-submit gate covers non-empty invalid
   *  input, this covers the click/Enter on an empty draft so it is never silent. */
  const [counterError, setCounterError] = useState<string | null>(null);

  // --- announcements (one polite status per table, deduplicated).
  const [marketAnnouncement, setMarketAnnouncement] = useState<TableAnnouncement | null>(null);
  const [freeAnnouncement, setFreeAnnouncement] = useState<TableAnnouncement | null>(null);
  const speak = useCallback((tableId: TableId, eventId: string, message: string) => {
    if (!announce({ tableId, eventId, message })) return;
    const line = { tableId, eventId, message };
    if (tableId === MARKET) setMarketAnnouncement(line);
    else setFreeAnnouncement(line);
  }, []);

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const run = async (label: string, write: () => Promise<unknown>) => {
    setStatus(`${label}...`);
    try {
      await write();
      setStatus(`${label}: done.`);
    } catch (error) {
      setStatus(`${label}: failed. ${describeRpcError(error as Parameters<typeof describeRpcError>[0])}`);
      throw error;
    }
  };

  const findPlayer = useCallback(
    (playerId: string): MarketPlayerRow | null => {
      // Read the current-or-previous success so a failed revalidation (rows
      // retained, non-blocking) keeps the Actions region usable (F1).
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
        // Defense-in-depth for non-UI callers (the disabled predicate is the
        // primary gate): never a silent no-op — surface it (F8).
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
        // Blocking task failure (AC-32): contextual role="alert", draft kept
        // so a transient rejection never wipes the typed amount.
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

  const onRespondToBid = (bidId: BidId, action: "accept" | "reject" | "counter") => {
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
      // Fresh modal per open: a stale error from a cancelled draft must not
      // leak into the next open (F8).
      setCounterError(null);
      return;
    }
    void run(action === "accept" ? "Accept" : "Reject", () =>
      runRespond({ saveId, bidId, action }),
    );
  };

  const onRespondAsBidder = (bidId: BidId, action: "accept" | "withdraw") =>
    run(action === "accept" ? "Accept counter" : "Withdraw", () =>
      runRespondAsBidder({ saveId, bidId, action }),
    );

  // --- selection cleared when the subject is filtered out or disappears;
  // unavailable → draft cleared + disabled + announced (note lifecycle table).
  const viewError = typedError(viewResult);
  // The current-or-previous success (seam F1): a failed revalidation flips the
  // atom to `Failure` but keeps the last `Success` in `previousSuccess`
  // (Atom.make's effect re-runs through `fromExitWithPrevious`). Rows remain
  // usable exactly when this Option is Some — the seam separating a blocking
  // load failure from a non-blocking refresh failure.
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

  // Latest-order refs for the stable live handlers and sort setters (they are
  // written after the TanStack instances derive their row ids each render).
  const marketIdsRef = useRef<readonly string[]>([]);
  const freeIdsRef = useRef<readonly string[]>([]);
  const marketActiveRef = useRef<string | null>(null);
  const freeActiveRef = useRef<string | null>(null);



  // --- live handlers: palette table actions (same options as the registry),
  // bid/sign, respond, focus-bid, retries.
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
            // Announce the palette filter like the visible controls and Squad do
            // (F-7 parity): the polite status reports the resulting row count.
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
      // Nothing drafted yet: land on the Market table's first row (the natural
      // start of the bid flow). Never `document.body`.
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

  const recordBookmark = useCallback(
    (key: TableId, ids: readonly string[], focusId: string | null): void => {
      const before = makeTableFocusBookmark(key, ids, focusId);
      if (before === null) return;
      if (key === MARKET) setMarketBookmarkState(before);
      else setFreeBookmarkState(before);
      update(key, { focusBookmark: before });
    },
    [],
  );

  const setSortFor = useCallback(
    (key: TableId, next: SortState | null) => {
      if (key === MARKET) setMarketSortState(next);
      else setFreeSortState(next);
      update(key, { sort: next });
    },
    [],
  );

  const setFiltersFor = useCallback(
    (key: TableId, next: readonly FilterClause[]) => {
      if (key === MARKET) setMarketFiltersState(next);
      else setFreeFiltersState(next);
      update(key, { filters: next });
    },
    [],
  );

  const filtersFor = useCallback(
    (key: TableId): readonly FilterClause[] => (key === MARKET ? marketFilters : freeFilters),
    [marketFilters, freeFilters],
  );

  const activeFor = useCallback(
    (key: TableId): string | null => (key === MARKET ? marketActive : freeActive),
    [marketActive, freeActive],
  );
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

  // --- the TanStack tables + the visible (post-filter) id sets. Filtering is
  // owned HERE (not inside TablePanel) so AC-31's selection/focus decisions use
  // exactly the visible rows; TablePanel renders the pre-filtered rows.
  const marketFiltered = applyFilters(marketRows, marketFilters);
  const freeFiltered = applyFilters(freeAgentRows, freeFilters);

  const marketTable = useTableDataFor(
    MARKET,
    marketPlayerColumns(),
    marketFiltered,
    marketSort,
    onSortChangeFor(MARKET),
  );
  const freeTable = useTableDataFor(
    FREE,
    freeAgentColumns(),
    freeFiltered,
    freeSort,
    onSortChangeFor(FREE),
  );

  const marketIds = marketTable.rowIds;
  const freeIds = freeTable.rowIds;
  marketIdsRef.current = marketIds;
  freeIdsRef.current = freeIds;
  marketActiveRef.current = marketActive;
  freeActiveRef.current = freeActive;
  const datasetKey = datasetIds.join(",");
  const marketIdsKey = marketIds.join(",");
  const freeIdsKey = freeIds.join(",");

  useEffect(() => {
    const current = selectedRef.current;
    if (current === null) return;
    const visibleIds = current.tableId === MARKET ? marketIds : freeIds;
    if (!datasetIds.includes(current.player.id)) {
      // Player left the market entirely — unavailable rule.
      setDraft(reduceBidDraft(draftRef.current, { _tag: "playerUnavailable" }));
      setSelected(null);
      setBidAlert("The selected player is no longer available for a bid.");
      speak(current.tableId, "player-unavailable", "The selected player is no longer available.");
      return;
    }
    if (!visibleIds.includes(current.player.id)) {
      // Filtered out — selection cleared explicitly (AC-31 first implementation).
      setDraft(reduceBidDraft(draftRef.current, { _tag: "selectionChangedTo", playerId: null }));
      setSelected(null);
      setBidAlert(null);
      speak(current.tableId, "selection-hidden", "The selected player is hidden by the current filters.");
    }
  }, [datasetKey, marketIdsKey, freeIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- session write-through + navigation cleanup.
  const update = (key: TableId, patch: Parameters<typeof updateTableSession>[1]): void => {
    updateTableSession(key, patch);
  };

  useEffect(() => {
    return () => {
      discardSelectionForNavigation(MARKET);
      discardSelectionForNavigation(FREE);
    };
  }, []);

  // --- note lifetime table (save reload): a save reload/switch clears the bid
  // draft. The draft is React state and dies with a remount anyway; dispatching
  // the reducer's `savedReloaded` event here keeps the note's "save reload →
  // Clear draft" row real in the app, defensive against any preserved state.
  useEffect(() => {
    setDraft(reduceBidDraft(draftRef.current, { _tag: "savedReloaded" }));
  }, [saveId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const ids = key === MARKET ? marketIds : freeIds;
      const bookmark = makeTableFocusBookmark(key, ids, id);
      if (key === MARKET) setMarketActiveState(id);
      else setFreeActiveState(id);
      if (bookmark !== null) {
        if (key === MARKET) setMarketBookmarkState(bookmark);
        else setFreeBookmarkState(bookmark);
        update(key, { focusBookmark: bookmark });
      }
    },
    [marketIds, freeIds],
  );

  const onBookmarkChangeFor = useCallback(
    (key: TableId) => (bookmark: TableFocusBookmark) => {
      if (key === MARKET) setMarketBookmarkState(bookmark);
      else setFreeBookmarkState(bookmark);
      update(key, { focusBookmark: bookmark });
    },
    [],
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

  // --- focus restoration (AC-31): when a sort/filter/refetch removes the
  // focused row, restore focus by stable id with neighbour fallback — the same
  // effect Squad runs, per table. Without it the focused `tr` button unmounts
  // and focus strands on `document.body` (the roving tab stop keys on a stale
  // activeId). Resolves to same → old next → old prev → first visible row →
  // the region's empty-target (the screen primary; never `document.body`).
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
      if (viewResult.waiting === true) return;
      if (active === null || ids.includes(active)) return;
      const resolved = resolveTableFocus(
        bookmark !== null && bookmark.tableId === key ? bookmark : null,
        ids,
      );
      if (resolved !== null) {
        onActiveChangeFor(key)(resolved);
        focusRowFor(key, resolved);
      } else {
        // The region emptied out — the empty-state target is the screen primary.
        focusSemanticTarget({ screen: "transfers" });
      }
    },
    [viewResult.waiting, onActiveChangeFor, focusRowFor],
  );
  // Market and Free Agents each own a restore slot keyed on their visible-id
  // set (post-filter), re-running after sort/filter/refetch.
  useEffect(() => {
    restoreFocusFor(MARKET, marketActive, marketBookmark, marketIds);
  }, [marketIdsKey, viewResult.waiting, marketActive, marketBookmark]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    restoreFocusFor(FREE, freeActive, freeBookmark, freeIds);
  }, [freeIdsKey, viewResult.waiting, freeActive, freeBookmark]); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = draftState.draft;
  const draftedPlayer = draft !== null ? findPlayer(draft.playerId) : null;
  const draftedPlayerName =
    draftedPlayer !== null ? `${draftedPlayer.firstName} ${draftedPlayer.lastName}` : "";
  const draftAmount = draft !== null ? Number(draft.amountInput) : 0;
  const draftAmountValid = draft !== null && isValidBidAmount(draft.amountInput);
  // The counter-offer input shares the same NaN-safe validity rule as the bid
  // draft (F8 family): a non-numeric amount disables the modal submit and shows
  // an inline error instead of silently doing nothing on submit.
  const counterAmountValid = isValidBidAmount(counterAmount);
  const windowOpen = view?.windowOpen ?? true;

  // Blocking load failure = error with NO retained rows (a failed revalidation
  // keeps `view` — that path renders the tables with a non-blocking line, F1).
  if (viewError !== null && view === undefined) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <div role="alert" className="mt-6 rounded border border-red-800 bg-red-950/40 p-4">
          <p className="text-red-300">{describeRpcError(viewError)}</p>
          <button
            type="button"
            data-action-id="retry-market-table"
            className={`mt-2 rounded bg-slate-700 px-3 py-1 text-sm ${FOCUS_RING.join(" ")}`}
            onClick={() => void dispatchAction("retry-market-table")}
          >
            {STATE_COPY["transfer-market"].retryLabel}
          </button>
        </div>
      </main>
    );
  }
  if (view === undefined) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <div aria-busy="true" className="py-8 text-slate-400">
          Loading transfers…
        </div>
      </main>
    );
  }

  const btn = "rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600";
  const btnCls = `${btn} ${FOCUS_RING.join(" ")}`;

  const focusBidAction = ACTION_REGISTRY.get("focus-bid");
  const bidBadge =
    focusBidAction !== undefined ? actionBadgeBinding(focusBidAction, "transfers") : null;

  const renderIncomingBid = (bid: {
    readonly id: BidId;
    readonly playerName: string;
    readonly biddingClubName: string;
    readonly amount: number;
    readonly status: string;
  }) => (
    <tr key={String(bid.id)} className="border-b border-slate-800">
      <td className="py-1 pr-4">{bid.playerName}</td>
      <td className="py-1 pr-4">{bid.biddingClubName}</td>
      <td className="py-1 pr-4">{formatCredits(bid.amount)}</td>
      <td className="py-1 pr-4">{bid.status}</td>
      <td className="py-1 pr-4">
        {bid.status === "pending" && (
          <div className="flex gap-1">
            <button
              type="button"
              data-action-id="respond-accept"
              className={btnCls}
              onClick={() => void dispatchAction("respond-accept", { bidId: bid.id })}
            >
              Accept
            </button>
            <button
              type="button"
              data-action-id="respond-counter"
              className={btnCls}
              onClick={() => void dispatchAction("respond-counter", { bidId: bid.id })}
            >
              Counter
            </button>
            <button
              type="button"
              data-action-id="respond-reject"
              className={btnCls}
              onClick={() => void dispatchAction("respond-reject", { bidId: bid.id })}
            >
              Reject
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  const renderOutgoingBid = (bid: {
    readonly id: BidId;
    readonly playerName: string;
    readonly sellingClubName: string;
    readonly amount: number;
    readonly counterAmount: number | null;
    readonly status: string;
  }) => (
    <tr key={String(bid.id)} className="border-b border-slate-800">
      <td className="py-1 pr-4">{bid.playerName}</td>
      <td className="py-1 pr-4">{bid.sellingClubName}</td>
      <td className="py-1 pr-4">{formatCredits(bid.amount)}</td>
      <td className="py-1 pr-4">{bid.counterAmount !== null ? formatCredits(bid.counterAmount) : "-"}</td>
      <td className="py-1 pr-4">{bid.status}</td>
      <td className="py-1 pr-4">
        {bid.status === "countered" && (
          <div className="flex gap-1">
            <button
              type="button"
              data-action-id="accept-counter"
              className={btnCls}
              onClick={() => void dispatchAction("accept-counter", { bidId: bid.id })}
            >
              Accept counter
            </button>
            <button
              type="button"
              data-action-id="withdraw-bid"
              className={btnCls}
              onClick={() => void dispatchAction("withdraw-bid", { bidId: bid.id })}
            >
              Withdraw
            </button>
          </div>
        )}
        {bid.status === "pending" && (
          <button
            type="button"
            data-action-id="withdraw-bid"
            className={btnCls}
            onClick={() => void dispatchAction("withdraw-bid", { bidId: bid.id })}
          >
            Withdraw
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">Transfers &mdash; {view.club.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        Transfer Window: {view.windowOpen ? "Open" : "Closed"} &middot; Transfer Budget:{" "}
        {formatCredits(view.transferBudgetRemaining)} &middot; Wage Budget:{" "}
        {formatCredits(view.wageBudgetUsed)} / {formatCredits(view.wageBudget)}
      </p>
      {status && <p className="mt-1 text-sm text-slate-400">{status}</p>}
      {refreshState._tag === "Refreshing" && (
        <p className="mt-1 text-sm text-slate-500">Refreshing…</p>
      )}
      {refreshState._tag === "RefreshFailed" && (
        <p className="mt-1 text-sm text-red-400">
          {STATE_COPY["transfer-market"].refreshFailed}{" "}
          <button
            type="button"
            data-action-id="retry-market-table"
            className={`rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-100 ${FOCUS_RING.join(" ")}`}
            onClick={() => void dispatchAction("retry-market-table")}
          >
            {STATE_COPY["transfer-market"].retryLabel}
          </button>
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Incoming Bids</h2>
        <table className="mt-2 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-4">Player</th>
              <th className="py-1 pr-4">From</th>
              <th className="py-1 pr-4">Amount</th>
              <th className="py-1 pr-4">Status</th>
              <th className="py-1 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.incomingBids.map(renderIncomingBid)}
            {view.incomingBids.length === 0 && (
              <tr>
                <td className="py-2 text-slate-500" colSpan={5}>
                  No incoming Bids.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Outgoing Bids</h2>
        <table className="mt-2 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-4">Player</th>
              <th className="py-1 pr-4">To</th>
              <th className="py-1 pr-4">Amount</th>
              <th className="py-1 pr-4">Counter</th>
              <th className="py-1 pr-4">Status</th>
              <th className="py-1 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.outgoingBids.map(renderOutgoingBid)}
            {view.outgoingBids.length === 0 && (
              <tr>
                <td className="py-2 text-slate-500" colSpan={6}>
                  No outgoing Bids.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Free Agents</h2>
        <TablePanel
          tableId={FREE}
          screen="transfers"
          region="freeAgentTable"
          label="Free Agents"
          columns={freeAgentColumns()}
          rows={freeFiltered}
          unfilteredRowCount={freeAgentRows.length}
          sort={freeSort}
          onSortChange={onSortChangeFor(FREE)}
          filters={freeFilters}
          onSetFilters={(next) => {
            setFiltersFor(FREE, next);
            speak(FREE, "filter-set", `${next.length === 0 ? "Cleared the Free Agents filters." : "Filters updated."}`);
          }}
          enableNameSearch
          enablePositionFilter
          activeId={freeActive}
          onActiveChange={onActiveChangeFor(FREE)}
          onBookmarkChange={onBookmarkChangeFor(FREE)}
          selectedId={selected !== null && selected.tableId === FREE ? selected.player.id : null}
          onToggleSelection={onToggleSelectionFor(FREE)}
          onRowPrimary={onRowPrimaryFor(FREE)}
          busy={refreshState._tag === "Refreshing"}
          announcement={freeAnnouncement?.message ?? ""}
          copy={STATE_COPY["free-agents"]}
          loadError={null}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Market</h2>
        <TablePanel
          tableId={MARKET}
          screen="transfers"
          region="marketTable"
          label="Market"
          columns={marketPlayerColumns()}
          rows={marketFiltered}
          unfilteredRowCount={marketRows.length}
          sort={marketSort}
          onSortChange={onSortChangeFor(MARKET)}
          filters={marketFilters}
          onSetFilters={(next) => {
            setFiltersFor(MARKET, next);
            speak(MARKET, "filter-set", `${next.length === 0 ? "Cleared the Market filters." : "Filters updated."}`);
          }}
          enableNameSearch
          enablePositionFilter
          activeId={marketActive}
          onActiveChange={onActiveChangeFor(MARKET)}
          onBookmarkChange={onBookmarkChangeFor(MARKET)}
          selectedId={selected !== null && selected.tableId === MARKET ? selected.player.id : null}
          onToggleSelection={onToggleSelectionFor(MARKET)}
          onRowPrimary={onRowPrimaryFor(MARKET)}
          busy={refreshState._tag === "Refreshing"}
          announcement={marketAnnouncement?.message ?? ""}
          copy={STATE_COPY["transfer-market"]}
          loadError={null}
        />
      </section>

      {/* Contextual Actions region (AC-29): bid entry lives here, never in a row. */}
      {draft !== null && draftedPlayer !== null && (
        <section
          className="mt-6 rounded border border-slate-700 bg-slate-900 p-4"
          data-action-region="place-bid"
          aria-label="Place bid"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {draftedPlayer.clubName === null ? "Sign free agent" : "Place bid"}
            {bidBadge !== null && <ActionKeyBadge binding={bidBadge} />}
          </h2>
          <p className="mt-1 text-slate-200">
            Player: {draftedPlayer.firstName} {draftedPlayer.lastName}
          </p>
          <p className="text-sm text-slate-400">
            Value: {formatCredits(draftedPlayer.transferValue)}
          </p>
          {draftedPlayer.clubName === null ? (
            <>
              <p className="mt-1 text-sm text-slate-400">
                Free Agent &mdash; signable for Credits 0.
              </p>
              <button
                type="button"
                data-action-id="sign-free-agent"
                className={`mt-3 rounded bg-slate-100 px-3 py-1 text-sm text-slate-900 ${FOCUS_RING.join(" ")}`}
                onClick={() => void dispatchAction("sign-free-agent", { playerId: draftedPlayer.id as PlayerId })}
              >
                Sign (0 Cr)
              </button>
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-sm text-slate-300" htmlFor="bid-amount">
                Your bid:
              </label>
              <input
                id="bid-amount"
                ref={amountInputRef}
                className={`w-32 rounded bg-slate-800 px-2 py-1 ${FOCUS_RING.join(" ")}`}
                placeholder="Amount"
                value={draft.amountInput}
                onChange={(event) =>
                  setDraft(reduceBidDraft(draftRef.current, { _tag: "amountChanged", value: event.target.value }))
                }
              />
              <button
                type="button"
                data-action-id="place-bid"
                className={`rounded bg-amber-500 px-3 py-1 text-sm text-slate-950 ${FOCUS_RING.join(" ")}`}
                disabled={!windowOpen || !draftAmountValid}
                onClick={() =>
                  void dispatchAction("place-bid", {
                    playerId: draftedPlayer.id as PlayerId,
                    amount: draftAmount,
                  })
                }
              >
                Bid
              </button>
            </div>
          )}
          {!windowOpen && (
            <p className="mt-2 text-sm text-slate-500">The transfer window is closed.</p>
          )}
          {bidAlert !== null && (
            <div role="alert" className="mt-2 text-sm text-red-300">
              {bidAlert}
            </div>
          )}
        </section>
      )}

      {/* Dirty-draft keep/discard dialog: no silent discard (note lifecycle).
          Keyboard-owned: initial focus on Keep, Tab trapped, Escape = keep/close,
          focus returned to the invoking control on close. */}
      {draftState._tag === "confirmDiscard" && draftState.draft !== null && (
        <KeepDiscardDialog
          playerName={draftedPlayerName}
          onKeep={() => {
            setDraft(reduceBidDraft(draftRef.current, { _tag: "keepCurrent" }));
            // Keep = selection reverts to the drafted player.
            const kept = findPlayer(draftState.draft!.playerId);
            setSelected(
              kept !== null
                ? {
                    tableId: marketRows.some((p) => p.id === kept.id) ? MARKET : FREE,
                    player: kept,
                  }
                : null,
            );
            // Close = focus returns to the invoking control (focus coordinator).
            restoreFocusAfterOverlay();
          }}
          onDiscard={() => {
            setDraft(reduceBidDraft(draftRef.current, { _tag: "discardRequested" }));
            amountInputRef.current?.focus();
          }}
        />
      )}

      {counters !== null && (
        <InlineModal
          title={`Counter ${counters.playerName}`}
          description={`Bid from ${counters.biddingClubName} for ${formatCredits(counters.amount)}.`}
          submitLabel="Counter"
          inputLabel="Counter-offer amount (Credits)"
          amountValue={counterAmount}
          onAmountChange={(value) => {
            setCounterAmount(value);
            setCounterError(null);
          }}
          onCancel={() => setCounter(null)}
          // The disabled submit is the primary gate for a non-empty invalid
          // amount; an EMPTY submit click falls through to the guard below,
          // which surfaces the same inline error — never a silent no-op (F8).
          submitDisabled={counterAmount !== "" && !counterAmountValid}
          error={
            counterError ??
            (counterAmount !== "" && !counterAmountValid
              ? "Enter a valid counter-offer amount."
              : null)
          }
          onSubmit={() => {
            if (!counterAmountValid) {
              setCounterError("Enter a valid counter-offer amount.");
              return;
            }
            const amount = Number(counterAmount);
            const bidId = counters.bidId;
            setCounter(null);
            setCounterError(null);
            void run("Counter", () =>
              runRespond({ saveId, bidId, action: "counter", counterAmount: amount }),
            );
          }}
        />
      )}
    </main>
  );
};

/** Small hook over a transfer table's TanStack instance: the row ids (after
 *  sort/filter) drive the availability/visibility effects. Sort/filter state is
 *  owned by the screen; the change callback flows straight through so a header
 *  click and the palette apply the same command. */
const useTableDataFor = (
  tableId: TableId,
  columns: ReturnType<typeof marketPlayerColumns>,
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