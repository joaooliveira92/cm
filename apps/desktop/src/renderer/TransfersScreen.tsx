/**
 * Transfers screen — thin composition shell. Mounts the provider and composes
 * guard views, header, and all table/bid leaves via useTransfers(). All state,
 * refs, and wiring live in the provider (tickets 12–13) and leaf components
 * (tickets 14–15).
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