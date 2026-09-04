/**
 * Transfers screen (ticket 19, Stage 5 — level-3 grid). Market and Free Agents
 * adopt TanStack tables with row-roving, sortable headers, visible + palette
 * filtering, and identity-based focus restoration; bid entry lives in a single
 * contextual Actions region behind the dirty-draft lifecycle (no silent
 * discard); the incoming/outgoing bid tables stay hand-rendered; the native
 * `prompt()` counter-offer path is replaced by an inline modal (ticket 04).
 */
import { useRef } from "react";
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { ACTION_REGISTRY } from "./actions/allActions.js";
import { dispatchAction } from "./actions/dispatch.js";
import { Alert } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { Input } from "./components/ui/input.js";
import { ActionKeyBadge, actionBadgeBinding } from "./discoverability/ActionKeyBadge.js";
import { describeRpcError } from "./rpc.js";
import { restoreFocusAfterOverlay } from "./focus.js";
import { InlineModal } from "./transfers/InlineModal.js";
import { useDialogKeyboard } from "./transfers/dialogKeyboard.js";
import { MarketTable } from "./transfers/MarketTable.js";
import { FreeAgentsTable } from "./transfers/FreeAgentsTable.js";
import { IncomingBidsTable } from "./transfers/IncomingBidsTable.js";
import { OutgoingBidsTable } from "./transfers/OutgoingBidsTable.js";
import { formatCredits } from "./table/transfers/marketColumns.js";
import { TransfersProvider, useTransfers } from "./TransfersProvider.js";
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

export const TransfersScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <TransfersProvider saveId={saveId}>
    <TransfersScreenInner />
  </TransfersProvider>
);

const TransfersScreenInner = () => {
  const { state, actions, meta } = useTransfers();
  const {
    status,
    bidAlert,
    draftState,
    counters,
    counterAmount,
    counterError,
    marketRows,
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
  } = state;
  const {
    setSelected,
    setDraft,
    setCounter,
    setCounterAmount,
    setCounterError,
    run,
    runRespond,
  } = actions;
  const { amountInputRef, draftRef, findPlayer, saveId } = meta;

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

      <IncomingBidsTable />

      <OutgoingBidsTable />

      <FreeAgentsTable />

      <MarketTable />

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