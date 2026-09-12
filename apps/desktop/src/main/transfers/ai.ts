import { randomUUID } from "node:crypto";
import { BidId, type ClubId, type PlayerId } from "@cm-clone/contracts";
import {
  AI_ACCEPT_BID_MULTIPLIER,
  AI_ACCEPT_COUNTER_MULTIPLIER,
  AI_COUNTER_TARGET_MULTIPLIER,
  AI_REJECT_BID_MULTIPLIER,
  DEFAULT_CONTRACT_YEARS,
  transferValue,
  weeklyWage,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import {
  appendHumanClubEvents,
  completeTransfer,
  loadBidRow,
  recordTransfer,
  type BidStatus,
} from "./bids.js";
import { loadClubBudgetRow, loadWageBudgetUsed } from "./budgets.js";
import { loadPlayerEcon } from "./economics.js";

// ---------------------------------------------------------------------------
// AI-club buying/selling (ticket 17): the same Bid/Sign machinery above, self-issued in-process
// on behalf of any club (not just the user's), never through the RpcGroup. `aiClubs.ts` owns
// target selection (which weak Position, which player); everything here is the generic
// buy/accept-counter/sign primitive that target selection calls into.
// ---------------------------------------------------------------------------

/**
 * The selling club's side of a fresh Bid, decided instantly against Transfer Value with
 * ADR-0005's fixed multipliers, shifted by the selling manager's Influence Pillar.
 * Every selling club in this build is AI-controlled — the user only ever plays the buying side
 * of `placeBid` (there's no second human to wait on) — so this stands in for the "AI-club selling"
 * behavior ADR-0005 specifies: accept >=1.0x outright, counter at exactly Transfer Value for
 * 0.85x-1.0x, reject outright below 0.85x, with boundaries modulated by Influence.
 * Pure and exported for direct unit testing, independent of the DB.
 *
 * @param amount - The bid amount
 * @param value - The player's Transfer Value
 * @param influenceModifier - The Influence Pillar's modifier (1.0 at neutral/3, <1.0 at lower, >1.0 at higher).
 *   Higher Influence shifts thresholds in the buyer's favor (wider accept range);
 *   lower Influence shifts them against the buyer (narrower accept range).
 */
export const decideAiSellerResponse = (
  amount: number,
  value: number,
  influenceModifier: number = 1.0,
): { readonly action: "accept" | "counter" | "reject"; readonly counterAmount: number | null } => {
  // Accept threshold is pushed down (easier to accept) by higher Influence, up by lower.
  const acceptThreshold = AI_ACCEPT_BID_MULTIPLIER / influenceModifier;
  // Reject threshold moves proportionally.
  const rejectThreshold = AI_REJECT_BID_MULTIPLIER / influenceModifier;

  if (amount >= value * acceptThreshold) {
    return { action: "accept", counterAmount: null };
  }
  if (amount >= value * rejectThreshold) {
    return { action: "counter", counterAmount: Math.round(value * AI_COUNTER_TARGET_MULTIPLIER) };
  }
  return { action: "reject", counterAmount: null };
};

/**
 * The AI-bidder side of a countered Bid (ticket 17 / ADR-0005): accepts up to
 * `AI_ACCEPT_COUNTER_MULTIPLIER` (1.15x) Transfer Value if still affordable — a fresh Transfer/
 * Wage Budget check, since an earlier Bid in the same window may already have spent it down —
 * otherwise withdraws. Two callers: `aiPlaceBid`'s own counter branch (AI-vs-AI; in practice
 * unreachable, see the note there) and `respondToBid`'s counter branch, the realistic path where
 * the human-controlled club counters an incoming Bid from an AI club.
 */
export const resolveAiCounterOffer = (bidId: BidId, biddingClubId: ClubId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const bid = yield* loadBidRow(bidId);
    if (!bid || bid.counterAmount === null) return;

    const player = yield* loadPlayerEcon(bid.playerId);
    if (!player || player.clubId === null) {
      yield* sql`UPDATE bids SET status = 'withdrawn' WHERE id = ${bidId}`;
      return;
    }

    const value = transferValue(player.overallRating, player.age, player.potentialAbility);
    const withinMultiplier = bid.counterAmount <= value * AI_ACCEPT_COUNTER_MULTIPLIER;

    const budget = yield* loadClubBudgetRow(biddingClubId);
    const wageUsed = yield* loadWageBudgetUsed(biddingClubId);
    const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
    const affordable = bid.counterAmount <= budget.transferBudgetRemaining && wageUsed + wage <= budget.wageBudget;

    if (withinMultiplier && affordable) {
      yield* completeTransfer({
        playerId: bid.playerId,
        sellingClubId: bid.sellingClubId,
        biddingClubId,
        amount: bid.counterAmount,
        seasonNumber,
      });
      yield* sql`UPDATE bids SET status = 'accepted' WHERE id = ${bidId}`;
    } else {
      yield* sql`UPDATE bids SET status = 'withdrawn' WHERE id = ${bidId}`;
    }
  });

/**
 * AI-club buyer's `PlaceBid` (ticket 17), parameterized so any club — not only the user's — can be
 * the bidder. Self-issued in-process by `aiClubs.ts`'s transfer-window orchestration, never through
 * the RpcGroup. Doesn't gate on window-open or re-validate the target — callers only invoke this
 * with a target already screened for affordability, during an open window.
 *
 * **The selling club decides how this resolves.** An AI seller answers instantly via
 * `decideAiSellerResponse`, as it always has. A Bid for one of the *human* club's players is
 * inserted `pending` and answered by nobody: it is the first thing in this simulation that waits on
 * the manager, and it is what makes `respondToBid`, `TransfersScreenView.incomingBids`, and the
 * `pending` status reachable in play rather than only from tests.
 *
 * A pending Bid also appends `BidReceived` to the human club's stream, which is what the News Inbox
 * projects it from. The event records that the Bid arrived; whether it is still awaiting an answer
 * is read live off the `bids` row, so the message can never disagree with the decision.
 *
 * `decideAiSellerResponse`'s counter/reject branches only trigger when `amount` is below Transfer
 * Value; `aiClubs.ts` always bids exactly Transfer Value, so an AI-to-AI bid always takes the
 * outright-accept branch. The counter handling is kept for spec-completeness (ticket 17's
 * checklist explicitly describes a "countered" reaction) and for any future caller that bids a
 * different amount.
 */
export const aiPlaceBid = (buyingClubId: ClubId, playerId: PlayerId, amount: number, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const player = yield* loadPlayerEcon(playerId);
    if (!player || player.clubId === null || player.clubId === buyingClubId) {
      return null;
    }

    const id = BidId.make(randomUUID());

    // A Bid for a human-club player is left for the manager. Nothing else in the transfer path
    // branches on who the seller is, which is exactly why the seller side has never been reachable.
    const sellerRows = yield* sql<{
      isUserClub: number;
    }>`SELECT is_user_club as "isUserClub" FROM clubs WHERE id = ${player.clubId}`;
    if (sellerRows[0]?.isUserClub === 1) {
      yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
        VALUES (${id}, ${playerId}, ${player.clubId}, ${buyingClubId}, ${amount}, ${null}, 'pending', ${seasonNumber})`;

      yield* appendHumanClubEvents(player.clubId, [
        {
          tag: "BidReceived",
          payload: {
            bidId: id,
            playerId,
            playerName: `${player.firstName} ${player.lastName}`,
            biddingClubId: buyingClubId,
            amount,
            seasonNumber,
          },
        },
      ]);

      return { id, status: "pending" as BidStatus };
    }

    const value = transferValue(player.overallRating, player.age, player.potentialAbility);
    const decision = decideAiSellerResponse(amount, value);
    const status: BidStatus =
      decision.action === "accept" ? "accepted" : decision.action === "counter" ? "countered" : "rejected";

    if (decision.action === "accept") {
      yield* completeTransfer({
        playerId,
        sellingClubId: player.clubId,
        biddingClubId: buyingClubId,
        amount,
        seasonNumber,
      });
    }

    yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
      VALUES (${id}, ${playerId}, ${player.clubId}, ${buyingClubId}, ${amount}, ${decision.counterAmount}, ${status}, ${seasonNumber})`;

    if (decision.action === "counter") {
      yield* resolveAiCounterOffer(id, buyingClubId, seasonNumber);
    }

    return { id, status };
  });

/**
 * AI-club version of `signFreeAgent` (ticket 17): any club, not just the user's, signs a Free
 * Agent for Credits 0 — no Bid/negotiation step for Free Agents (ADR-0005), so unlike `aiPlaceBid`
 * this is the whole flow by itself. Self-issued in-process by `aiClubs.ts`.
 */
export const aiSignFreeAgent = (clubId: ClubId, playerId: PlayerId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const player = yield* loadPlayerEcon(playerId);
    if (!player || player.clubId !== null) return;

    const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
    yield* sql`UPDATE players SET club_id = ${clubId} WHERE id = ${playerId}`;
    yield* recordTransfer({ playerId, fromClubId: null, toClubId: clubId, fee: 0 });
    yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
      VALUES (${playerId}, ${wage}, ${DEFAULT_CONTRACT_YEARS}, ${seasonNumber})`;

    yield* appendHumanClubEvents(clubId, [
      { tag: "PlayerSigned", payload: { playerId, wage, years: DEFAULT_CONTRACT_YEARS } },
    ]);
  });
