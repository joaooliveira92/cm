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

/** One player on the Contract Expiry screen — a manager's own-club player whose Contract is in
 *  its last year (`years_remaining === 1`), before the season-end expiry sweep releases them
 *  as a Free Agent. */
export class ContractExpiryPlayerView extends Schema.Class<ContractExpiryPlayerView>("ContractExpiryPlayerView")({
  playerId: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  wage: Schema.Finite,
  yearsRemaining: Schema.Finite,
}) {}

/** The Contract Expiry screen (Screen 141, without Bosman): the manager's own-club Players who
 *  are in their last contracted year, with wage and years remaining. A pure read — no command
 *  side on this screen. */
export class ContractExpiryScreenView extends Schema.Class<ContractExpiryScreenView>("ContractExpiryScreenView")({
  players: Schema.Array(ContractExpiryPlayerView),
}) {}

/** The Transfer and Wage Budget Review screen (Screen 145): the manager's club's Transfer Budget
 *  remaining, Wage Budget, total wages committed by active Contracts, and the headroom left under
 *  the Wage Budget. A pure read — no command side. */
export class BudgetReviewView extends Schema.Class<BudgetReviewView>("BudgetReviewView")({
  transferBudgetRemaining: Schema.Finite,
  wageBudget: Schema.Finite,
  committedWages: Schema.Finite,
  headroom: Schema.Finite,
}) {}

/** One row of the Transfer History screen: a completed transfer into or out of a club. `fromClubName`
 *  is `null` when there was no selling club — a **Free Agent** signing, which CONTEXT.md defines as a
 *  Credits 0 move through the same signing flow. */
export class TransferHistoryEntryView extends Schema.Class<TransferHistoryEntryView>("TransferHistoryEntryView")({
  /** The `player_transfers` row id, used as a stable list key and as the newest-first tie-break. */
  id: Schema.Finite,
  /** ISO `YYYY-MM-DD`, the in-world date the transfer completed — never the wall clock. */
  transferredOn: Schema.String,
  playerFirstName: Schema.String,
  playerLastName: Schema.String,
  /** `null` for a Free Agent signing: there was no Club to leave. */
  fromClubName: Schema.NullOr(Schema.String),
  toClubName: Schema.String,
  /** The fee in Credits. Credits 0 for a Free Agent signing. */
  fee: Schema.Finite,
}) {}

/** The Transfer History screen (Screen 146): every completed transfer into or out of the manager's
 *  Club, newest first. A pure read — no command side on this screen. */
export class TransferHistoryView extends Schema.Class<TransferHistoryView>("TransferHistoryView")({
  entries: Schema.Array(TransferHistoryEntryView),
}) {}

/** Club Transfers (Screen 42): one club's completed transfers, newest first. Same shape and same
 *  reasoning as `ClubFixturesView` — the club rides with the rows so one read answers the page.
 *  Declared here because this module already depends on `clubs.ts`. */
export class ClubTransfersView extends Schema.Class<ClubTransfersView>("ClubTransfersView")({
  club: ClubSummary,
  isUserClub: Schema.Boolean,
  entries: Schema.Array(TransferHistoryEntryView),
}) {}

/**
 * Club Finances (Screen 39): one club's budgets, for **any** club in the save.
 *
 * The same four figures `BudgetReviewView` carries, plus the club they belong to — so one read
 * answers the whole page, as `ClubStaffView`'s comment argues. Income, expenditure and projections
 * are absent because they have no model; the Group C ledger `deferred`s them rather than this view
 * carrying a zero that reads like a fact.
 */
export class ClubFinancesView extends Schema.Class<ClubFinancesView>("ClubFinancesView")({
  club: ClubSummary,
  isUserClub: Schema.Boolean,
  transferBudgetRemaining: Schema.Finite,
  wageBudget: Schema.Finite,
  committedWages: Schema.Finite,
  headroom: Schema.Finite,
}) {}
