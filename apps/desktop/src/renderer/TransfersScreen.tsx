/**
 * Transfers screen (ticket 19, Stage 5 — level-3 grid). Market and Free Agents
 * adopt TanStack tables with row-roving, sortable headers, visible + palette
 * filtering, and identity-based focus restoration; bid entry lives in a single
 * contextual Actions region behind the dirty-draft lifecycle (no silent
 * discard); the incoming/outgoing bid tables stay hand-rendered; the native
 * `prompt()` counter-offer path is replaced by an inline modal (ticket 04).
 */
import { useRef } from "react";
import type { BidId, PlayerId, SaveId } from "@cm-clone/contracts";
import { ACTION_REGISTRY } from "./actions/allActions.js";
import { dispatchAction } from "./actions/dispatch.js";
import { Alert } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { Input } from "./components/ui/input.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table.js";
import { ActionKeyBadge, actionBadgeBinding } from "./discoverability/ActionKeyBadge.js";
import { describeRpcError } from "./rpc.js";
import { restoreFocusAfterOverlay } from "./focus.js";
import { InlineModal } from "./transfers/InlineModal.js";
import { useDialogKeyboard } from "./transfers/dialogKeyboard.js";
import { formatCredits, marketPlayerColumns } from "./table/transfers/marketColumns.js";
import { freeAgentColumns } from "./table/transfers/freeAgentColumns.js";
import { useTransfersScreen } from "./useTransfersScreen.js";
import { TablePanel } from "./table/TablePanel.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "./theme.js";
import { STATE_COPY } from "./table/viewState.js";
import { reduceBidDraft } from "./table/bidDraft.js";

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
  const { containerRef, onKeyDown } = useDialogKeyboard({
    initialFocus: () => keepRef.current,
    onEscape: () => {
      onKeep();
    },
    restoreOnClose: false,
  });

  return (
    <div
      className={MODAL_SCRIM}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onKeep();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Discard the bid in progress?"
        onKeyDown={onKeyDown}
        className={MODAL_COMPACT}
      >
        <div className={MODAL_TITLE_BAND}>
          <h2 className="font-semibold">Discard the bid in progress?</h2>
        </div>
        <div className={MODAL_BODY}>
          <p className="text-sm text-text-secondary">
            You typed an amount for {playerName}. Moving away would lose this bid
            unless you keep it.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button ref={keepRef} type="button" variant="secondary" onClick={onKeep}>
              Keep bid
            </Button>
            <Button type="button" onClick={onDiscard}>
              Discard draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TransfersScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const {
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
    setFiltersFor,
    speak,
    amountInputRef,
    run,
    findPlayer,
    runRespond,
    onSortChangeFor,
    onToggleSelectionFor,
    onActiveChangeFor,
    onBookmarkChangeFor,
    onRowPrimaryFor,
  } = useTransfersScreen(saveId);

  // Blocking load failure = error with NO retained rows (a failed revalidation
  // keeps `view` — that path renders the tables with a non-blocking line, F1).
  if (viewError !== null && view === undefined) {
    return (
      <main className="bg-background p-8 text-foreground">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <Alert variant="destructive" className="mt-6">
          <p>{describeRpcError(viewError)}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            data-action-id="retry-market-table"
            onClick={() => void dispatchAction("retry-market-table")}
          >
            {STATE_COPY["transfer-market"].retryLabel}
          </Button>
        </Alert>
      </main>
    );
  }
  if (view === undefined) {
    return (
      <main className="bg-background p-8 text-foreground">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <div aria-busy="true" className="py-8 text-text-secondary">
          Loading transfers…
        </div>
      </main>
    );
  }

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
    <TableRow key={String(bid.id)}>
      <TableCell className="pr-4">{bid.playerName}</TableCell>
      <TableCell className="pr-4">{bid.biddingClubName}</TableCell>
      <TableCell className="pr-4">{formatCredits(bid.amount)}</TableCell>
      <TableCell className="pr-4">{bid.status}</TableCell>
      <TableCell className="pr-4">
        {bid.status === "pending" && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-action-id="respond-accept"
              onClick={() => void dispatchAction("respond-accept", { bidId: bid.id })}
            >
              Accept
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-action-id="respond-counter"
              onClick={() => void dispatchAction("respond-counter", { bidId: bid.id })}
            >
              Counter
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-action-id="respond-reject"
              onClick={() => void dispatchAction("respond-reject", { bidId: bid.id })}
            >
              Reject
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );

  const renderOutgoingBid = (bid: {
    readonly id: BidId;
    readonly playerName: string;
    readonly sellingClubName: string;
    readonly amount: number;
    readonly counterAmount: number | null;
    readonly status: string;
  }) => (
    <TableRow key={String(bid.id)}>
      <TableCell className="pr-4">{bid.playerName}</TableCell>
      <TableCell className="pr-4">{bid.sellingClubName}</TableCell>
      <TableCell className="pr-4">{formatCredits(bid.amount)}</TableCell>
      <TableCell className="pr-4">{bid.counterAmount !== null ? formatCredits(bid.counterAmount) : "-"}</TableCell>
      <TableCell className="pr-4">{bid.status}</TableCell>
      <TableCell className="pr-4">
        {bid.status === "countered" && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-action-id="accept-counter"
              onClick={() => void dispatchAction("accept-counter", { bidId: bid.id })}
            >
              Accept counter
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-action-id="withdraw-bid"
              onClick={() => void dispatchAction("withdraw-bid", { bidId: bid.id })}
            >
              Withdraw
            </Button>
          </div>
        )}
        {bid.status === "pending" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-action-id="withdraw-bid"
            onClick={() => void dispatchAction("withdraw-bid", { bidId: bid.id })}
          >
            Withdraw
          </Button>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <main className="bg-background p-8 text-foreground">
      <h1 className="text-2xl font-bold">Transfers</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Transfer Window: {view.windowOpen ? "Open" : "Closed"} &middot; Transfer Budget:{" "}
        {formatCredits(view.transferBudgetRemaining)} &middot; Wage Budget:{" "}
        {formatCredits(view.wageBudgetUsed)} / {formatCredits(view.wageBudget)}
      </p>
      {status && <p className="mt-1 text-sm text-text-secondary">{status}</p>}
      {refreshState._tag === "Refreshing" && (
        <p className="mt-1 text-sm text-text-muted">Refreshing…</p>
      )}
      {refreshState._tag === "RefreshFailed" && (
        <p className="mt-1 text-sm text-destructive">
          {STATE_COPY["transfer-market"].refreshFailed}{" "}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-action-id="retry-market-table"
            onClick={() => void dispatchAction("retry-market-table")}
          >
            {STATE_COPY["transfer-market"].retryLabel}
          </Button>
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Incoming Bids</h2>
        <Table className="mt-2 min-w-full text-left">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pr-4">Player</TableHead>
              <TableHead className="pr-4">From</TableHead>
              <TableHead className="pr-4">Amount</TableHead>
              <TableHead className="pr-4">Status</TableHead>
              <TableHead className="pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.incomingBids.map(renderIncomingBid)}
            {view.incomingBids.length === 0 && (
              <TableRow>
                <TableCell className="py-2 text-text-muted" colSpan={5}>
                  No incoming Bids.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Outgoing Bids</h2>
        <Table className="mt-2 min-w-full text-left">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pr-4">Player</TableHead>
              <TableHead className="pr-4">To</TableHead>
              <TableHead className="pr-4">Amount</TableHead>
              <TableHead className="pr-4">Counter</TableHead>
              <TableHead className="pr-4">Status</TableHead>
              <TableHead className="pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.outgoingBids.map(renderOutgoingBid)}
            {view.outgoingBids.length === 0 && (
              <TableRow>
                <TableCell className="py-2 text-text-muted" colSpan={6}>
                  No outgoing Bids.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
          sort={free.sort}
          onSortChange={onSortChangeFor(FREE)}
          filters={free.filters}
          onSetFilters={(next) => {
            setFiltersFor(FREE, next);
            speak(FREE, "filter-set", `${next.length === 0 ? "Cleared the Free Agents filters." : "Filters updated."}`);
          }}
          enableNameSearch
          enablePositionFilter
          activeId={free.active}
          onActiveChange={onActiveChangeFor(FREE)}
          onBookmarkChange={onBookmarkChangeFor(FREE)}
          selectedId={selected !== null && selected.tableId === FREE ? selected.player.id : null}
          onToggleSelection={onToggleSelectionFor(FREE)}
          onRowPrimary={onRowPrimaryFor(FREE)}
          busy={refreshState._tag === "Refreshing"}
          announcement={free.announcement?.message ?? ""}
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
          sort={market.sort}
          onSortChange={onSortChangeFor(MARKET)}
          filters={market.filters}
          onSetFilters={(next) => {
            setFiltersFor(MARKET, next);
            speak(MARKET, "filter-set", `${next.length === 0 ? "Cleared the Market filters." : "Filters updated."}`);
          }}
          enableNameSearch
          enablePositionFilter
          activeId={market.active}
          onActiveChange={onActiveChangeFor(MARKET)}
          onBookmarkChange={onBookmarkChangeFor(MARKET)}
          selectedId={selected !== null && selected.tableId === MARKET ? selected.player.id : null}
          onToggleSelection={onToggleSelectionFor(MARKET)}
          onRowPrimary={onRowPrimaryFor(MARKET)}
          busy={refreshState._tag === "Refreshing"}
          announcement={market.announcement?.message ?? ""}
          copy={STATE_COPY["transfer-market"]}
          loadError={null}
        />
      </section>

      {/* Contextual Actions region (AC-29): bid entry lives here, never in a row. */}
      {draft !== null && draftedPlayer !== null && (
        <section
          className="mt-6 rounded-panel border border-panel-border bg-panel-bg p-3 shadow-panel"
          data-action-region="place-bid"
          aria-label="Place bid"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {draftedPlayer.clubName === null ? "Sign free agent" : "Place bid"}
            {bidBadge !== null && <ActionKeyBadge binding={bidBadge} />}
          </h2>
          <p className="mt-1 text-text-strong">
            Player: {draftedPlayer.firstName} {draftedPlayer.lastName}
          </p>
          <p className="text-sm text-text-secondary">
            Value: {formatCredits(draftedPlayer.transferValue)}
          </p>
          {draftedPlayer.clubName === null ? (
            <>
              <p className="mt-1 text-sm text-text-secondary">
                Free Agent &mdash; signable for Credits 0.
              </p>
              <Button
                type="button"
                className="mt-3"
                data-action-id="sign-free-agent"
                onClick={() => void dispatchAction("sign-free-agent", { playerId: draftedPlayer.id as PlayerId })}
              >
                Sign (0 Cr)
              </Button>
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-sm text-text-body" htmlFor="bid-amount">
                Your bid:
              </label>
              <Input
                id="bid-amount"
                ref={amountInputRef}
                className="w-32"
                placeholder="Amount"
                value={draft.amountInput}
                onChange={(event) =>
                  setDraft(reduceBidDraft(draftRef.current, { _tag: "amountChanged", value: event.target.value }))
                }
              />
              <Button
                type="button"
                data-action-id="place-bid"
                disabled={!windowOpen || !draftAmountValid}
                onClick={() =>
                  void dispatchAction("place-bid", {
                    playerId: draftedPlayer.id as PlayerId,
                    amount: draftAmount,
                  })
                }
              >
                Bid
              </Button>
            </div>
          )}
          {!windowOpen && (
            <p className="mt-2 text-sm text-text-muted">The transfer window is closed.</p>
          )}
          {bidAlert !== null && (
            <Alert variant="destructive" className="mt-2">
              {bidAlert}
            </Alert>
          )}
        </section>
      )}

      {/* Dirty-draft keep/discard dialog: no-silent-discard (note lifecycle).
          Keyboard-owned: initial focus on Keep, Tab trapped, Escape = keep/close,
          focus returned to the invoking control on close. */}
      {draftState._tag === "confirmDiscard" && draftState.draft !== null && (
        <KeepDiscardDialog
          playerName={draftedPlayerName}
          onKeep={() => {
            setDraft(reduceBidDraft(draftRef.current, { _tag: "keepCurrent" }));
            const kept = findPlayer(draftState.draft!.playerId);
            setSelected(
              kept !== null
                ? {
                    tableId: marketRows.some((p) => p.id === kept.id) ? MARKET : FREE,
                    player: kept,
                  }
                : null,
            );
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