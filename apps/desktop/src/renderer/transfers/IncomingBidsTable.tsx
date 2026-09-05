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

/** The incoming-bids table leaf: hand-rendered rows driven by the shared
 *  transfers view, with the accept/reject/counter actions dispatching through
 *  the global action registry. */
export const IncomingBidsTable = () => {
  const { state } = useTransfers();
  const { view } = state;
  if (view === undefined) return null;

  return (
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
          {view.incomingBids.map((bid) => (
            <IncomingBidRow key={String(bid.id)} bid={bid} />
          ))}
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
  );
};

const IncomingBidRow = ({
  bid,
}: {
  readonly bid: {
    readonly id: BidId;
    readonly playerName: string;
    readonly biddingClubName: string;
    readonly amount: number;
    readonly status: string;
  };
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