import type { KnownFigure } from "@cm-clone/shared";
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

/** Raised when a Contract Offer's terms are not ones the offer could carry: a Role the player does
 *  not hold, a duration outside the 1-5 year Contract length, or a wage outside the wage the
 *  club's knowledge published for that player. The wage bound is the Scouting Progress rule again
 *  (Agent Note 2026-09-19) — an unscouted manager may not name a wage their own knowledge band does
 *  not contain, and a Fully Scouted one may not move off the exact figure at all. */
export class InvalidContractOfferTermsError extends Schema.TaggedError<InvalidContractOfferTermsError>()(
  "InvalidContractOfferTermsError",
  {
    playerId: PlayerId,
    reason: Schema.String,
  },
) {}

/** Raised when `renewContract` is asked to renew a Contract that is not in its last contracted
 *  year (`years_remaining > 1`). A Contract's terms are never renegotiated mid-term (CONTEXT.md,
 *  Contract); renewal is the one exception and it is available only in the final year (Agent Note:
 *  a Contract renews only in its last contracted year). */
export class ContractRenewalNotDueError extends Schema.TaggedError<ContractRenewalNotDueError>()(
  "ContractRenewalNotDueError",
  {
    playerId: PlayerId,
    yearsRemaining: Schema.Finite,
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

/** One figure the market shows about a player: the exact value, or the Attribute-Range band the
 *  manager's Scouting Progress publishes (CONTEXT.md, Attribute Range / Fully Scouted). The `_tag`
 *  decides the shape — a boolean `exact` flag that could claim a range is really exact has no place
 *  here, and unknown keys are dropped, so a second figure can never ride along. */
export const PlayerFigureSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal("exact"), value: Schema.Finite }),
  Schema.Struct({ _tag: Schema.Literal("range"), low: Schema.Finite, high: Schema.Finite }),
]) satisfies Schema.Schema<KnownFigure>;

/** A player as seen on the transfer market — another club's player (biddable) or a Free Agent
 * (`clubId`/`clubName` null, signable for Credits 0 via the normal signing flow, no Bid step).
 * `overallRating` and `transferValue` are read by the human club's Scouting Progress: ranges below
 * Fully Scouted, exact figures at it (Agent Note 2026-09-19, ticket 09). */
export class MarketPlayerView extends Schema.Class<MarketPlayerView>("MarketPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  clubId: Schema.NullOr(ClubId),
  clubName: Schema.NullOr(Schema.String),
  overallRating: PlayerFigureSchema,
  transferValue: PlayerFigureSchema,
  positions: Schema.Array(PlayerPositionView),
}) {}

/**
 * The Contract Offer a manager writes to one Free Agent (Screen 137) — the player's worth, and the
 * terms the offer can carry.
 *
 * Every figure is a `PlayerFigureSchema`, gated on the same Scouting Progress the market and the
 * Player Profile read that player by: a Range below Fully Scouted, exact at it. The wage is derived
 * from the Rating band rather than banded off the true wage, so the offer cannot publish a price
 * the club's knowledge of the Rating does not support. No field on this view is an exact number
 * below Fully Scouted, which is the whole point of the read (Agent Note 2026-09-19, ticket 09).
 *
 * The Role an offer carries is not a field: `POSITION_ROLES` maps each Position to exactly one
 * Role, so the offer names one of the player's Positions and the Role follows from it
 * (CONTEXT.md, Role). The renderer reads the mapping off `@cm-clone/shared` and
 * `signFreeAgent` re-checks the named Role against the player's own Positions, so a Role can never
 * be attached to a player who does not hold it.
 */
export class ContractOfferView extends Schema.Class<ContractOfferView>("ContractOfferView")({
  playerId: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  /** The Positions the offer may name, most familiar first — the role choice, in the vocabulary the
   *  player actually plays. */
  positions: Schema.Array(PlayerPositionView),
  overallRating: PlayerFigureSchema,
  transferValue: PlayerFigureSchema,
  /** The wage band the club's knowledge supports (or the exact wage at Fully Scouted). The offer's
   *  `wage` term must fall inside it. */
  wage: PlayerFigureSchema,
}) {}

/** The Transfer market/inbox screen (ticket 16): budgets, incoming/outgoing Bids, Free Agents,
 *  and other clubs' biddable players. */
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
  /** The whole own-club squad today, leaving players included. Beside `players` it is the squad the
   *  coming rollover leaves behind, which the short-squad Continue advisory reads. */
  squadSize: Schema.Natural,
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
