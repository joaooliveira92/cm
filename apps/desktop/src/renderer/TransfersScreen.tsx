import { useState } from "react";
import type { BidId, PlayerId, SaveId, TransfersScreenView } from "@cm-clone/contracts";
import {
  describeRpcError,
  placeBidMutation,
  respondAsBidderMutation,
  respondToBidMutation,
  signFreeAgentMutation,
  transfersAtom,
  typedError,
  useAtomSet,
  useAtomValue,
} from "./rpc.js";

const formatCredits = (amount: number) => `${amount.toLocaleString()} Cr`;

export const TransfersScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const viewResult = useAtomValue(transfersAtom(saveId));
  const [status, setStatus] = useState<string | null>(null);
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});

  const runBid = useAtomSet(placeBidMutation, { mode: "promise" });
  const runSign = useAtomSet(signFreeAgentMutation, { mode: "promise" });
  const runRespond = useAtomSet(respondToBidMutation, { mode: "promise" });
  const runRespondAsBidder = useAtomSet(respondAsBidderMutation, { mode: "promise" });

  const viewError = typedError(viewResult);
  if (viewError) return <p className="p-8 text-red-400">{describeRpcError(viewError)}</p>;
  if (viewResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading transfers...</p>;
  if (viewResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load Transfers screen</p>;

  const view: TransfersScreenView = viewResult.value;

  const run = async (label: string, write: () => Promise<unknown>) => {
    setStatus(`${label}...`);
    try {
      await write();
      setStatus(`${label}: done.`);
    } catch (error) {
      setStatus(`${label}: failed. ${describeRpcError(error as Parameters<typeof describeRpcError>[0])}`);
    }
  };

  const onBid = (playerId: PlayerId) => {
    const amount = Number(bidAmounts[playerId] ?? 0);
    if (!amount || amount <= 0) return;
    void run("Bid", () => runBid({ saveId, playerId, amount }));
  };

  const onSignFreeAgent = (playerId: PlayerId) =>
    run("Sign", () => runSign({ saveId, playerId }));

  const onRespondToBid = (bidId: BidId, action: "accept" | "reject" | "counter") => {
    if (action === "counter") {
      const counterAmount = Number(prompt("Counter-offer amount (Credits)") ?? "");
      if (!counterAmount || counterAmount <= 0) return;
      void run("Counter", () =>
        runRespond({ saveId, bidId, action, counterAmount }),
      );
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

  const renderMarketPlayer = (player: {
    readonly id: PlayerId;
    readonly firstName: string;
    readonly lastName: string;
    readonly age: number;
    readonly clubName: string | null;
    readonly clubId: string | null;
    readonly overallRating: number;
    readonly transferValue: number;
  }) => (
    <tr key={player.id} className="border-b border-slate-800">
      <td className="py-1 pr-4 whitespace-nowrap">
        {player.firstName} {player.lastName}
      </td>
      <td className="py-1 pr-4">{player.age}</td>
      <td className="py-1 pr-4">{player.clubName ?? "Free Agent"}</td>
      <td className="py-1 pr-4">{player.overallRating}</td>
      <td className="py-1 pr-4">{formatCredits(player.transferValue)}</td>
      <td className="py-1 pr-4">
        {player.clubId === null ? (
          <button
            type="button"
            className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
            onClick={() => onSignFreeAgent(player.id)}
          >
            Sign (0 Cr)
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              className="w-28 rounded bg-slate-800 px-2 py-1 text-xs"
              placeholder="Amount"
              value={bidAmounts[player.id] ?? ""}
              onChange={(event) =>
                setBidAmounts((prev) => ({ ...prev, [player.id]: event.target.value }))
              }
            />
            <button
              type="button"
              className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
              onClick={() => onBid(player.id)}
            >
              Bid
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  const renderIncomingBid = (bid: {
    readonly id: BidId;
    readonly playerName: string;
    readonly biddingClubName: string;
    readonly amount: number;
    readonly status: string;
  }) => (
    <tr key={bid.id} className="border-b border-slate-800">
      <td className="py-1 pr-4">{bid.playerName}</td>
      <td className="py-1 pr-4">{bid.biddingClubName}</td>
      <td className="py-1 pr-4">{formatCredits(bid.amount)}</td>
      <td className="py-1 pr-4">{bid.status}</td>
      <td className="py-1 pr-4">
        {bid.status === "pending" && (
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
              onClick={() => onRespondToBid(bid.id, "accept")}
            >
              Accept
            </button>
            <button
              type="button"
              className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
              onClick={() => onRespondToBid(bid.id, "counter")}
            >
              Counter
            </button>
            <button
              type="button"
              className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
              onClick={() => onRespondToBid(bid.id, "reject")}
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
    <tr key={bid.id} className="border-b border-slate-800">
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
              className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
              onClick={() => onRespondAsBidder(bid.id, "accept")}
            >
              Accept counter
            </button>
            <button
              type="button"
              className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
              onClick={() => onRespondAsBidder(bid.id, "withdraw")}
            >
              Withdraw
            </button>
          </div>
        )}
        {bid.status === "pending" && (
          <button
            type="button"
            className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
            onClick={() => onRespondAsBidder(bid.id, "withdraw")}
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
      {viewResult.waiting && <p className="mt-1 text-sm text-slate-500">Refreshing…</p>}

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
        <table className="mt-2 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-4">Name</th>
              <th className="py-1 pr-4">Age</th>
              <th className="py-1 pr-4">Club</th>
              <th className="py-1 pr-4">OVR</th>
              <th className="py-1 pr-4">Value</th>
              <th className="py-1 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.freeAgents.map(renderMarketPlayer)}
            {view.freeAgents.length === 0 && (
              <tr>
                <td className="py-2 text-slate-500" colSpan={6}>
                  No Free Agents.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Market</h2>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="py-1 pr-4">Name</th>
                <th className="py-1 pr-4">Age</th>
                <th className="py-1 pr-4">Club</th>
                <th className="py-1 pr-4">OVR</th>
                <th className="py-1 pr-4">Value</th>
                <th className="py-1 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>{view.marketPlayers.map(renderMarketPlayer)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
};