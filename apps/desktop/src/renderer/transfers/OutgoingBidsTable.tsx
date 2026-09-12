import type { BidId } from "@cm-clone/contracts";
import { dispatchAction } from "../actions/dispatch.js";
import { Button } from "../components/ui/button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { useTransfers } from "./TransfersProvider.js";
import { formatCredits } from "../table/transfers/marketColumns.js";

/** The outgoing-bids table leaf: hand-rendered rows driven by the shared
 *  transfers view, with accept-counter/withdraw actions dispatching through
 *  the global action registry. */
export const OutgoingBidsTable = () => {
  const { state } = useTransfers();
  const { view } = state;
  if (view === undefined) return null;

  return (
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
          {view.outgoingBids.map((bid) => (
            <OutgoingBidRow key={String(bid.id)} bid={bid} />
          ))}
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
  );
};

const OutgoingBidRow = ({
  bid,
}: {
  readonly bid: {
    readonly id: BidId;
    readonly playerName: string;
    readonly sellingClubName: string;
    readonly amount: number;
    readonly counterAmount: number | null;
    readonly status: string;
  };
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