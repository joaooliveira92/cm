import { Schema } from "effect";

import { ClubSummary } from "./clubs.js";
import { BidId, ClubId, PlayerId, SaveId } from "./ids.js";
import { SeasonView } from "./season.js";
import { PlayerPositionView } from "./squad.js";

/** `expired` is a Bid the selling club never answered — distinct from `rejected`, which is an
 *  answer. Only reachable for a Bid whose seller is the human club, since every other seller
 *  resolves inside the command that placed the Bid. */
export const BID_STATUSES = [
  "pending",
  "countered",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
] as const;
export const BidStatusSchema = Schema.Literals(BID_STATUSES);

export const SELLER_BID_ACTIONS = ["accept", "reject", "counter"] as const;
export const SellerBidActionSchema = Schema.Literals(SELLER_BID_ACTIONS);

export const BIDDER_BID_ACTIONS = ["accept", "withdraw"] as const;
export const BidderBidActionSchema = Schema.Literals(BIDDER_BID_ACTIONS);

/** Raised when a transfer Command (`PlaceBid`, `SignFreeAgent`, `RenewContract`, ...) is issued
 * outside an open Transfer Window (`pre_season` or `mid_window_open`, ticket 15/16). */
export class TransferWindowClosedError extends Schema.TaggedError<TransferWindowClosedError>()(
  "TransferWindowClosedError",
  {
    saveId: SaveId,
  },
) {}

export class PlayerNotFoundError extends Schema.TaggedError<PlayerNotFoundError>()(
  "PlayerNotFoundError",
  {
    playerId: PlayerId,
  },
) {}

/** Raised when a Bid/Sign/Renew would spend more of a club's Transfer Budget than remains this
 * Season (spend-down, no replenishment between windows — ADR-0005). */
export class InsufficientTransferBudgetError extends Schema.TaggedError<InsufficientTransferBudgetError>()(
  "InsufficientTransferBudgetError",
  {
    clubId: ClubId,
    amount: Schema.Finite,
    remaining: Schema.Finite,
  },
) {}

/** Raised when signing/renewing at the formula wage would push a club's sum of active Contracts'
 * wages over its Wage Budget (a running cap, not spend-down — ADR-0005). */
export class WageBudgetExceededError extends Schema.TaggedError<WageBudgetExceededError>()(
  "WageBudgetExceededError",
  {
    clubId: ClubId,
    wage: Schema.Finite,
    wageBudgetUsed: Schema.Finite,
    wageBudget: Schema.Finite,
  },
) {}

export class BidNotFoundError extends Schema.TaggedError<BidNotFoundError>()("BidNotFoundError", {
  bidId: BidId,
}) {}

/** Raised for a Bid-flow action that doesn't fit the single-counter-offer state machine — e.g. a
 * second counter, responding to a Bid that's already resolved, or bidding on your own player. */
export class InvalidBidActionError extends Schema.TaggedError<InvalidBidActionError>()(
  "InvalidBidActionError",
  {
    reason: Schema.String,
  },
) {}

export class PlayerNotFreeAgentError extends Schema.TaggedError<PlayerNotFreeAgentError>()(
  "PlayerNotFreeAgentError",
  {
    playerId: PlayerId,
  },
) {}

/** One in-flight or resolved Bid, from the user club's point of view — `sellingClubId`/
 * `biddingClubId` disambiguate incoming vs. outgoing without a separate "direction" field. */
export class BidView extends Schema.Class<BidView>("BidView")({
  id: BidId,
  playerId: PlayerId,
  playerName: Schema.String,
  sellingClubId: ClubId,
  sellingClubName: Schema.String,
  biddingClubId: ClubId,
  biddingClubName: Schema.String,
  amount: Schema.Finite,
  counterAmount: Schema.NullOr(Schema.Finite),
  status: BidStatusSchema,
}) {}

/** A player as seen on the transfer market — another club's player (biddable) or a Free Agent
 * (`clubId`/`clubName` null, signable for Credits 0 via the normal signing flow, no Bid step). */
export class MarketPlayerView extends Schema.Class<MarketPlayerView>("MarketPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  clubId: Schema.NullOr(ClubId),
  clubName: Schema.NullOr(Schema.String),
  overallRating: Schema.Finite,
  transferValue: Schema.Finite,
  positions: Schema.Array(PlayerPositionView),
}) {}

/** The Transfer market/inbox screen (ticket 16): budgets, incoming/outgoing Bids, Free Agents,
 * and other clubs' biddable players. */
export class TransfersScreenView extends Schema.Class<TransfersScreenView>("TransfersScreenView")({
  club: ClubSummary,
  season: SeasonView,
  windowOpen: Schema.Boolean,
  transferBudgetRemaining: Schema.Finite,
  wageBudget: Schema.Finite,
  wageBudgetUsed: Schema.Finite,
  incomingBids: Schema.Array(BidView),
  outgoingBids: Schema.Array(BidView),
  freeAgents: Schema.Array(MarketPlayerView),
  marketPlayers: Schema.Array(MarketPlayerView),
}) {}
