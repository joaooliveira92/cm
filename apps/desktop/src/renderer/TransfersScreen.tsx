/**
 * Transfers screen (ticket 19, Stage 5 — level-3 grid). Market and Free Agents
 * adopt TanStack tables with row-roving, sortable headers, visible + palette
 * filtering, and identity-based focus restoration; bid entry lives in a single
 * contextual Actions region behind the dirty-draft lifecycle (no silent
 * discard); the incoming/outgoing bid tables stay hand-rendered; the native
 * `prompt()` counter-offer path is replaced by an inline modal (ticket 04).
 */
import type { SaveId } from "@cm-clone/contracts";
import { dispatchAction } from "./actions/dispatch.js";
import { Alert } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { describeRpcError } from "./rpc.js";
import { MarketTable } from "./transfers/MarketTable.js";
import { FreeAgentsTable } from "./transfers/FreeAgentsTable.js";
import { IncomingBidsTable } from "./transfers/IncomingBidsTable.js";
import { OutgoingBidsTable } from "./transfers/OutgoingBidsTable.js";
import { BidComposer } from "./transfers/BidComposer.js";
import { CounterOfferModal } from "./transfers/CounterOfferModal.js";
import { formatCredits } from "./table/transfers/marketColumns.js";
import { TransfersProvider, useTransfers } from "./TransfersProvider.js";
import { STATE_COPY } from "./table/viewState.js";

export const TransfersScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <TransfersProvider saveId={saveId}>
    <TransfersScreenInner />
  </TransfersProvider>
);

const TransfersScreenInner = () => {
  const { state } = useTransfers();
  const { status, refreshState, viewError, view } = state;

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

      <BidComposer />

      <CounterOfferModal />
    </main>
  );
};