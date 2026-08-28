import { Schema } from "effect";
import {
  FAMILIARITY_TIERS,
  FORMATIONS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  MANAGER_OUTCOMES,
  MENTALITY_OPTIONS,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  PRESSING_OPTIONS,
  ROLES,
  STATURE_TIERS,
  TEMPO_OPTIONS,
  VERDICTS,
} from "@cm-clone/shared";

export class SaveSummary extends Schema.Class<SaveSummary>("SaveSummary")({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.String,
}) {}

export class SaveNotFoundError extends Schema.TaggedError<SaveNotFoundError>()(
  "SaveNotFoundError",
  {
    id: Schema.String,
  },
) {}

export const PositionSchema = Schema.Literals(POSITIONS);
export const FamiliarityTierSchema = Schema.Literals(FAMILIARITY_TIERS);
export const StatureTierSchema = Schema.Literals(STATURE_TIERS);

export class PlayerPositionView extends Schema.Class<PlayerPositionView>("PlayerPositionView")({
  position: PositionSchema,
  familiarity: FamiliarityTierSchema,
}) {}

/**
 * Every outfield Attribute is required, 1-20; goalkeeping Attributes are undefined for outfield
 * players. Hidden attributes ride along optionally so the match engine receives them when it builds
 * a team setup — no UI group renders them, so they stay hidden at the display layer.
 */
export const AttributesSchema = Schema.Struct({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, Schema.Number])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(Schema.Number)])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(Schema.Number)])),
});

export class SquadPlayerView extends Schema.Class<SquadPlayerView>("SquadPlayerView")({
  id: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  dateOfBirth: Schema.String,
  age: Schema.Number,
  attributes: AttributesSchema,
  positions: Schema.Array(PlayerPositionView),
  overallRating: Schema.Number,
  positionRatings: Schema.Record(Schema.String, Schema.Number),
  /** The player's current Condition (%) from the Season's fitness ledger (ticket 10) — below 100
   * means they carry a shortfall from a recent heavy fixture/injury that hasn't fully recovered. */
  condition: Schema.Number,
}) {}

export class ClubSummary extends Schema.Class<ClubSummary>("ClubSummary")({
  id: Schema.String,
  name: Schema.String,
  statureTier: StatureTierSchema,
}) {}

export class SquadView extends Schema.Class<SquadView>("SquadView")({
  club: ClubSummary,
  players: Schema.Array(SquadPlayerView),
}) {}

export const FormationSchema = Schema.Literals(FORMATIONS);
export const RoleSchema = Schema.Literals(ROLES);
export const MentalitySchema = Schema.Literals(MENTALITY_OPTIONS);
export const TempoSchema = Schema.Literals(TEMPO_OPTIONS);
export const PressingSchema = Schema.Literals(PRESSING_OPTIONS);

export class TacticSlot extends Schema.Class<TacticSlot>("TacticSlot")({
  position: PositionSchema,
  role: RoleSchema,
  playerId: Schema.String,
}) {}

/** The `ChangeTactics` command payload shape (ADR-0003 / ticket 03): a Formation, a Role and
 * player per slot, and the 3 Team Instructions. */
export class Tactic extends Schema.Class<Tactic>("Tactic")({
  formation: FormationSchema,
  slots: Schema.Array(TacticSlot),
  mentality: MentalitySchema,
  tempo: TempoSchema,
  pressing: PressingSchema,
}) {}

export class InvalidTacticError extends Schema.TaggedError<InvalidTacticError>()(
  "InvalidTacticError",
  {
    reason: Schema.String,
  },
) {}

export class TacticsScreenView extends Schema.Class<TacticsScreenView>("TacticsScreenView")({
  club: ClubSummary,
  squad: Schema.Array(SquadPlayerView),
  tactic: Schema.NullOr(Tactic),
}) {}

/** Season/Calendar Decider vocabulary (ticket 15 / ADR-0004): the Calendar advances only by jumping to
 * the next Matchday or Transfer Window boundary, never a day-by-day clock. */
export const SEASON_PHASES = ["pre_season", "in_season", "mid_window_open", "season_complete"] as const;
export const SeasonPhaseSchema = Schema.Literals(SEASON_PHASES);

export class SeasonView extends Schema.Class<SeasonView>("SeasonView")({
  seasonNumber: Schema.Number,
  currentMatchday: Schema.Number,
  phase: SeasonPhaseSchema,
}) {}

export class FixtureView extends Schema.Class<FixtureView>("FixtureView")({
  id: Schema.String,
  matchday: Schema.Number,
  homeClubId: Schema.String,
  homeClubName: Schema.String,
  awayClubId: Schema.String,
  awayClubName: Schema.String,
  homeGoals: Schema.NullOr(Schema.Number),
  awayGoals: Schema.NullOr(Schema.Number),
  played: Schema.Boolean,
}) {}

export class FixturesView extends Schema.Class<FixturesView>("FixturesView")({
  season: SeasonView,
  fixtures: Schema.Array(FixtureView),
}) {}

/** One League Table row — points → goal difference → goals scored tie-break order (ADR-0004),
 * no head-to-head. */
export class LeagueTableRow extends Schema.Class<LeagueTableRow>("LeagueTableRow")({
  clubId: Schema.String,
  clubName: Schema.String,
  played: Schema.Number,
  won: Schema.Number,
  drawn: Schema.Number,
  lost: Schema.Number,
  goalsFor: Schema.Number,
  goalsAgainst: Schema.Number,
  goalDifference: Schema.Number,
  points: Schema.Number,
}) {}

export class LeagueTableView extends Schema.Class<LeagueTableView>("LeagueTableView")({
  season: SeasonView,
  standings: Schema.Array(LeagueTableRow),
}) {}

/** Board Objective Verdict (ADR-0006 / ticket 18): compares the player's club's final League
 * position to its Season-start band. */
export const VerdictSchema = Schema.Literals(VERDICTS);

/** Consecutive-Miss Counter outcome (ADR-0006 / ticket 18): `"none"` when the counter didn't cross
 * a threshold this Season, `"warned"`/`"sacked"` on the 0->1/1->2 transitions. */
export const ManagerOutcomeSchema = Schema.Literals(MANAGER_OUTCOMES);

export class AdvanceCalendarResult extends Schema.Class<AdvanceCalendarResult>("AdvanceCalendarResult")({
  season: SeasonView,
  resolvedMatchday: Schema.NullOr(Schema.Number),
  transferWindowClosed: Schema.NullOr(Schema.String),
  transferWindowOpened: Schema.NullOr(Schema.String),
  seasonConcluded: Schema.Boolean,
  /** Set only when `seasonConcluded` — the `BoardObjectiveJudged` Verdict for the player's club,
   * computed in the same request right after `SeasonConcluded` (ticket 18 / ADR-0006). Callers that
   * only need the headline outcome don't need a follow-up `getSeasonSummary` call; the full
   * band/standings breakdown still lives there. */
  boardObjectiveVerdict: Schema.NullOr(VerdictSchema),
  /** Set only when `seasonConcluded` — whether the Consecutive-Miss Counter crossed the
   * warn/sack threshold this Season (ticket 18 / ADR-0006). */
  managerOutcome: ManagerOutcomeSchema,
}) {}

/** Raised when `AdvanceCalendar` is invoked after the Season's final Matchday has already resolved —
 * Season rollover into a new Season is out of this ticket's scope. */
export class SeasonCompleteError extends Schema.TaggedError<SeasonCompleteError>()(
  "SeasonCompleteError",
  {
    saveId: Schema.String,
  },
) {}

/** Raised by any mutating command once `ManagerSacked` has archived the save (ADR-0006 / ticket 18):
 * read-only from that point on, no re-hire flow. */
export class SaveSackedError extends Schema.TaggedError<SaveSackedError>()("SaveSackedError", {
  saveId: Schema.String,
}) {}

/** The player's club's Board Objective for one Season (ticket 18 / ADR-0006) — `finalPosition`/
 * `verdict` are `null` until `SeasonConcluded` triggers `BoardObjectiveJudged`. */
export class BoardObjectiveView extends Schema.Class<BoardObjectiveView>("BoardObjectiveView")({
  seasonNumber: Schema.Number,
  clubId: Schema.String,
  minPosition: Schema.Number,
  maxPosition: Schema.Number,
  finalPosition: Schema.NullOr(Schema.Number),
  verdict: Schema.NullOr(VerdictSchema),
}) {}

/** Season summary screen (ticket 18): final League Table position, the Board Objective Verdict, and
 * (if applicable) the warning/sacking outcome and the running Consecutive-Miss Counter. */
export class SeasonSummaryView extends Schema.Class<SeasonSummaryView>("SeasonSummaryView")({
  season: SeasonView,
  standings: Schema.Array(LeagueTableRow),
  clubId: Schema.String,
  clubName: Schema.String,
  finalPosition: Schema.NullOr(Schema.Number),
  boardObjective: Schema.NullOr(BoardObjectiveView),
  managerOutcome: ManagerOutcomeSchema,
  consecutiveMisses: Schema.Number,
  sacked: Schema.Boolean,
}) {}

export class ClubNotFoundError extends Schema.TaggedError<ClubNotFoundError>()("ClubNotFoundError", {
  id: Schema.String,
}) {}

export class MatchNotFoundError extends Schema.TaggedError<MatchNotFoundError>()("MatchNotFoundError", {
  matchId: Schema.String,
}) {}

/** A Match Decider stream is keyed by a fresh matchId (ADR-0007); ticket 15's fixture list exists
 * separately, so `startMatch` (ticket 13) lets the player pick any other club as a stand-in
 * opponent for a manual friendly — see `listOpponentClubs`. */
export class MatchSummary extends Schema.Class<MatchSummary>("MatchSummary")({
  matchId: Schema.String,
  homeClubId: Schema.String,
  homeClubName: Schema.String,
  awayClubId: Schema.String,
  awayClubName: Schema.String,
}) {}

/** One rendered Commentary Line (ADR-0008) — minute is a separate field, never baked into `text`. */
export class CommentaryLineView extends Schema.Class<CommentaryLineView>("CommentaryLineView")({
  minute: Schema.Number,
  tag: Schema.String,
  text: Schema.String,
}) {}

/** Per-club substitution cap status (ticket 14: 5 subs / 3 windows, halftime doesn't count as a
 * window — see `computeSubstitutionStatus` in `apps/desktop/src/main/match.ts`) — lets the UI
 * disable the substitution control and show subs used/remaining without guessing at the engine's
 * cap enforcement (which otherwise just silently no-ops an over-cap `MakeSubstitution`). */
export class SubstitutionStatusView extends Schema.Class<SubstitutionStatusView>("SubstitutionStatusView")({
  used: Schema.Number,
  remaining: Schema.Number,
  windowsUsed: Schema.Number,
  windowsRemaining: Schema.Number,
  capReached: Schema.Boolean,
}) {}

/** A typed `Injury` Match Event, so the renderer's commentary/indicators and the no-subs prompts
 * consume the same typed data the engine emits (ticket 08/07) — no separate representation. */
export class InjuryView extends Schema.Class<InjuryView>("InjuryView")({
  minute: Schema.Number,
  teamClubId: Schema.String,
  playerId: Schema.String,
  trigger: Schema.Literals(["contact", "non-contact"]),
  severity: Schema.Literals(["light", "medium", "severe"]),
  tier: Schema.Literals(["orange", "red"]),
  type: Schema.Literals(["brokenToe", "twistedAnkle", "deadLeg", "hamstring", "calf", "strain"]),
}) {}

/** `ResumeSimulation`'s response (ADR-0007 chunked resimulation, no RPC streaming): the next chunk
 * of already-rendered Commentary Lines after `cursor`, the new cursor, and whether the match has
 * reached `FullTimeWhistle`. `homeSubs`/`awaySubs` and `injuredClubIds` are ticket 14 additions —
 * `injuredClubIds` lists the clubs (deduplicated) that had an `Injury` Match Event land in *this*
 * chunk, so the renderer can prompt an immediate substitution. `injuries` (ticket 08) carries the
 * full typed detail of each `Injury` in this chunk for severity-scaled indicators/prompts. */
export class ResumeSimulationView extends Schema.Class<ResumeSimulationView>("ResumeSimulationView")({
  matchId: Schema.String,
  cursor: Schema.Number,
  isComplete: Schema.Boolean,
  homeScore: Schema.Number,
  awayScore: Schema.Number,
  lines: Schema.Array(CommentaryLineView),
  homeSubs: SubstitutionStatusView,
  awaySubs: SubstitutionStatusView,
  injuredClubIds: Schema.Array(Schema.String),
  injuries: Schema.Array(InjuryView),
  /** On-pitch head-counts for both clubs as of this chunk (ticket 11) — a value below 11 means
   * the team is playing with 10 (an empty slot / forced-off), surfacing the no-subs fallback. */
  homeOnPitchCount: Schema.Number,
  awayOnPitchCount: Schema.Number,
  /** Per-player Condition (%) at full time, keyed by playerId across both teams (ticket 02). */
  conditions: Schema.Record(Schema.String, Schema.Number),
}) {}

/** `SubmitMatchCommand` (ticket 14) payload shapes — structurally identical to game-engine's
 * `ChangeTacticsCommand`/`MakeSubstitutionCommand` (`packages/game-engine/src/match/commands.ts`),
 * duplicated here rather than imported so `@cm-clone/contracts` stays decoupled from
 * `@cm-clone/game-engine` (same rationale as `MatchTactic` aliasing `Tactic` the other way). */
export class ChangeTacticsCommandPayload extends Schema.Class<ChangeTacticsCommandPayload>(
  "ChangeTacticsCommandPayload",
)({
  _tag: Schema.Literal("ChangeTactics"),
  clubId: Schema.String,
  tactic: Tactic,
}) {}

export class MakeSubstitutionCommandPayload extends Schema.Class<MakeSubstitutionCommandPayload>(
  "MakeSubstitutionCommandPayload",
)({
  _tag: Schema.Literal("MakeSubstitution"),
  clubId: Schema.String,
  outPlayerId: Schema.String,
  inPlayerId: Schema.String,
}) {}

/** `ForceOff` (ticket 11): manager drags an on-pitch player off to 10 men (no-subs bring-off) —
 * structurally identical to game-engine's `ForceOffCommand` (`packages/game-engine/src/match/
 * commands.ts`), duplicated here to keep `@cm-clone/contracts` decoupled from `@cm-clone/game-engine`. */
export class ForceOffCommandPayload extends Schema.Class<ForceOffCommandPayload>("ForceOffCommandPayload")({
  _tag: Schema.Literal("ForceOff"),
  clubId: Schema.String,
  playerId: Schema.String,
}) {}

export const MatchCommandPayload = Schema.Union([
  ChangeTacticsCommandPayload,
  MakeSubstitutionCommandPayload,
  ForceOffCommandPayload,
]);

// ---------------------------------------------------------------------------
// Transfers & contracts (ticket 16 / ADR-0005)
// ---------------------------------------------------------------------------

export const BID_STATUSES = ["pending", "countered", "accepted", "rejected", "withdrawn"] as const;
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
    saveId: Schema.String,
  },
) {}

export class PlayerNotFoundError extends Schema.TaggedError<PlayerNotFoundError>()(
  "PlayerNotFoundError",
  {
    playerId: Schema.String,
  },
) {}

/** Raised when a Bid/Sign/Renew would spend more of a club's Transfer Budget than remains this
 * Season (spend-down, no replenishment between windows — ADR-0005). */
export class InsufficientTransferBudgetError extends Schema.TaggedError<InsufficientTransferBudgetError>()(
  "InsufficientTransferBudgetError",
  {
    clubId: Schema.String,
    amount: Schema.Number,
    remaining: Schema.Number,
  },
) {}

/** Raised when signing/renewing at the formula wage would push a club's sum of active Contracts'
 * wages over its Wage Budget (a running cap, not spend-down — ADR-0005). */
export class WageBudgetExceededError extends Schema.TaggedError<WageBudgetExceededError>()(
  "WageBudgetExceededError",
  {
    clubId: Schema.String,
    wage: Schema.Number,
    wageBudgetUsed: Schema.Number,
    wageBudget: Schema.Number,
  },
) {}

export class BidNotFoundError extends Schema.TaggedError<BidNotFoundError>()("BidNotFoundError", {
  bidId: Schema.String,
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
    playerId: Schema.String,
  },
) {}

/** One in-flight or resolved Bid, from the user club's point of view — `sellingClubId`/
 * `biddingClubId` disambiguate incoming vs. outgoing without a separate "direction" field. */
export class BidView extends Schema.Class<BidView>("BidView")({
  id: Schema.String,
  playerId: Schema.String,
  playerName: Schema.String,
  sellingClubId: Schema.String,
  sellingClubName: Schema.String,
  biddingClubId: Schema.String,
  biddingClubName: Schema.String,
  amount: Schema.Number,
  counterAmount: Schema.NullOr(Schema.Number),
  status: BidStatusSchema,
}) {}

/** A player as seen on the transfer market — another club's player (biddable) or a Free Agent
 * (`clubId`/`clubName` null, signable for Credits 0 via the normal signing flow, no Bid step). */
export class MarketPlayerView extends Schema.Class<MarketPlayerView>("MarketPlayerView")({
  id: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Number,
  clubId: Schema.NullOr(Schema.String),
  clubName: Schema.NullOr(Schema.String),
  overallRating: Schema.Number,
  transferValue: Schema.Number,
  positions: Schema.Array(PlayerPositionView),
}) {}

/** The Transfer market/inbox screen (ticket 16): budgets, incoming/outgoing Bids, Free Agents,
 * and other clubs' biddable players. */
export class TransfersScreenView extends Schema.Class<TransfersScreenView>("TransfersScreenView")({
  club: ClubSummary,
  season: SeasonView,
  windowOpen: Schema.Boolean,
  transferBudgetRemaining: Schema.Number,
  wageBudget: Schema.Number,
  wageBudgetUsed: Schema.Number,
  incomingBids: Schema.Array(BidView),
  outgoingBids: Schema.Array(BidView),
  freeAgents: Schema.Array(MarketPlayerView),
  marketPlayers: Schema.Array(MarketPlayerView),
}) {}
