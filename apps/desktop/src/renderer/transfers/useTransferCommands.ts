/**
 * Every write the Transfers screen can perform: the four mutation handles, the
 * `run` status wrapper, and the bid/sign/respond commands built on them. The
 * `status`/`bidAlert` strings live here because they are this hook's output —
 * nothing else in the screen writes them.
 */
import { useCallback, useEffect, useState } from "react";
import type { BidId, PlayerId, RpcPayload, SaveId, TransfersScreenView } from "@cm-clone/contracts";
import { Option } from "effect";
import {
  AsyncResult,
  describeRpcError,
  placeBidMutation,
  respondAsBidderMutation,
  respondToBidMutation,
  signFreeAgentMutation,
  useAtomSet,
} from "../rpc.js";
import { marketPlayerRowOf, type MarketPlayerRow } from "../table/transfers/marketColumns.js";
import type { BidDraftState } from "../table/bidDraft.js";
import { reduceBidDraft } from "../table/bidDraft.js";
import type { TableId } from "../table/types.js";
import type { RpcClientError } from "../rpc/errors.js";
import { registerActionHandler } from "../actions/dispatch.js";
import { focusIdOf } from "../focus.js";
import { FREE, MARKET } from "./tableIds.js";
import type { CounterState } from "./useBidDraft.js";

/** The atom result the Transfers screen reads, named once for the two refs that carry it. */
export type TransfersViewResult = AsyncResult.AsyncResult<
  TransfersScreenView,
  RpcClientError<"getTransfersScreen">
>;

export interface TransferCommandsParams {
  readonly saveId: SaveId;
  readonly viewResult: TransfersViewResult;
  readonly viewResultRef: React.MutableRefObject<TransfersViewResult>;
  readonly selectedRef: React.MutableRefObject<{ readonly tableId: TableId } | null>;
  readonly draftRef: React.MutableRefObject<BidDraftState>;
  readonly setDraft: (next: BidDraftState) => void;
  readonly setCounter: (next: CounterState | null) => void;
  readonly setCounterAmount: (next: string) => void;
  readonly setCounterError: (next: string | null) => void;
  readonly speak: (key: TableId, kind: string, message: string) => void;
}

export interface TransferCommandsValue {
  readonly status: string | null;
  readonly bidAlert: string | null;
  readonly setBidAlert: React.Dispatch<React.SetStateAction<string | null>>;
  readonly run: (label: string, write: () => Promise<unknown>) => Promise<void>;
  readonly runRespond: (payload: RpcPayload<"respondToBid">) => Promise<unknown>;
  readonly findPlayer: (playerId: string) => MarketPlayerRow | null;
  readonly selectionChange: (tableId: TableId, playerId: string | null) => void;
  readonly onBid: (playerId: PlayerId, amount: number) => void;
  readonly onSignFreeAgent: (playerId: PlayerId) => void;
  readonly onRespondToBid: (bidId: BidId, action: "accept" | "reject" | "counter") => void;
  readonly onRespondAsBidder: (bidId: BidId, action: "accept" | "withdraw") => Promise<void>;
}

export const useTransferCommands = ({
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
}: TransferCommandsParams): TransferCommandsValue => {
  const [status, setStatus] = useState<string | null>(null);
  const [bidAlert, setBidAlert] = useState<string | null>(null);

  const runBid = useAtomSet(placeBidMutation, { mode: "promise" });
  const runSign = useAtomSet(signFreeAgentMutation, { mode: "promise" });
  const runRespond = useAtomSet(respondToBidMutation, { mode: "promise" });
  const runRespondAsBidder = useAtomSet(respondAsBidderMutation, { mode: "promise" });

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

  return {
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
  };
};

export interface TransferCommandHandlersParams {
  readonly saveId: SaveId;
  readonly draftRef: React.MutableRefObject<BidDraftState>;
  readonly amountInputRef: React.MutableRefObject<HTMLInputElement | null>;
  readonly marketIdsRef: React.MutableRefObject<readonly string[]>;
  readonly refresh: () => void;
  readonly onBid: (playerId: PlayerId, amount: number) => void;
  readonly onSignFreeAgent: (playerId: PlayerId) => void;
  readonly onRespondToBid: (bidId: BidId, action: "accept" | "reject" | "counter") => void;
  readonly onRespondAsBidder: (bidId: BidId, action: "accept" | "withdraw") => Promise<void>;
}

/** Binds the transfer commands to the Action registry for the life of a save. */
export const useTransferCommandHandlers = ({
  saveId,
  draftRef,
  amountInputRef,
  marketIdsRef,
  refresh,
  onBid,
  onSignFreeAgent,
  onRespondToBid,
  onRespondAsBidder,
}: TransferCommandHandlersParams): void => {
  useEffect(() => {
    const unregisters: Array<() => void> = [];

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
    return () => {
      for (const unregister of unregisters) unregister();
    };
    // Handlers read through refs.
  }, [saveId]); // eslint-disable-line react-hooks/exhaustive-deps
};
