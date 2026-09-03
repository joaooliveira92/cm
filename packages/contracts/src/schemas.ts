import { Schema } from "effect";
import {
  ADVANCED_OPTIONS_VERSION,
  ARCHIVED_CAUSES,
  CATEGORIES,
  INFORMATION_VISIBILITIES,
  INTENT_SOURCES,
  ISSUE_CODES,
  ISSUE_LEVELS,
  MATCH_SIMULATION_DETAILS,
  NATION_SELECTION_STATES,
  ROSTER_GENERATION_DETAILS,
  SIMULATION_MODES,
  SIMULATION_SPEED_RATINGS,
  TRANSFER_MARKET_ACTIVITIES,
  FAMILIARITY_TIERS,
  FORMATIONS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  MANAGER_ARCHETYPES,
  MANAGER_OUTCOMES,
  MENTALITY_OPTIONS,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  PRESSING_OPTIONS,
  ROLES,
  SQUAD_QUALITY_BANDS,
  STATURE_TIERS,
  TEMPO_OPTIONS,
  VERDICTS,
} from "@cm-clone/shared";

/**
 * Branded ID types. Every entity identifier in this contract is a `string` at runtime, so without
 * a brand `startMatch({ saveId, opponentClubId })` accepts the two transposed and the whole
 * codebase agrees. `Schema.brand` is nominal — it narrows the decoded type and adds no runtime
 * check — so decoding a payload hands the main process values that only fit the parameter they
 * belong to. Construct one from a raw string (a SQL row, a `randomUUID()`) with `SaveId.make(s)`.
 */
export const SaveId = Schema.String.pipe(Schema.brand("SaveId"));
export type SaveId = Schema.Schema.Type<typeof SaveId>;

export const ClubId = Schema.String.pipe(Schema.brand("ClubId"));
export type ClubId = Schema.Schema.Type<typeof ClubId>;

export const PlayerId = Schema.String.pipe(Schema.brand("PlayerId"));
export type PlayerId = Schema.Schema.Type<typeof PlayerId>;

export const MatchId = Schema.String.pipe(Schema.brand("MatchId"));
export type MatchId = Schema.Schema.Type<typeof MatchId>;

export const FixtureId = Schema.String.pipe(Schema.brand("FixtureId"));
export type FixtureId = Schema.Schema.Type<typeof FixtureId>;

export const BidId = Schema.String.pipe(Schema.brand("BidId"));
export type BidId = Schema.Schema.Type<typeof BidId>;

/** The cause that archived a save (ticket 02): `"sacked"` when the board ended the career,
 * `"retired"` when the player did. `null` is the whole of "active" — there is no separate boolean,
 * so no pair of fields that must agree. */
export const ArchivedCauseSchema = Schema.Literals(ARCHIVED_CAUSES);

export class SaveSummary extends Schema.Class<SaveSummary>("SaveSummary")({
  id: SaveId,
  name: Schema.String,
  createdAt: Schema.String,
  /** `null` while the career is live. Set once the save is an Archived Save, so the Save List can
   * mark it without opening the career. */
  archivedCause: Schema.NullOr(ArchivedCauseSchema),
}) {}

export class SaveNotFoundError extends Schema.TaggedError<SaveNotFoundError>()(
  "SaveNotFoundError",
  {
    id: SaveId,
  },
) {}

export const PositionSchema = Schema.Literals(POSITIONS);
export const FamiliarityTierSchema = Schema.Literals(FAMILIARITY_TIERS);
export const StatureTierSchema = Schema.Literals(STATURE_TIERS);

/** The four Attribute Categories a Training Focus may name (Player Development / Training Focus). */
export const TrainingFocusSchema = Schema.Literals(CATEGORIES);

/** A player's Training Focus: a Category, or `null` meaning the no-focus default. */
export const NullableTrainingFocusSchema = Schema.NullOr(TrainingFocusSchema);

// ---------------------------------------------------------------------------
// Manager Profile (ticket 03)
// ---------------------------------------------------------------------------

export const ManagerArchetypeSchema = Schema.Literals(MANAGER_ARCHETYPES);

export class PillarDistribution extends Schema.Class<PillarDistribution>("PillarDistribution")({
  tacticalAcumen: Schema.Finite,
  influence: Schema.Finite,
  regimen: Schema.Finite,
  technicalCoaching: Schema.Finite,
}) {}

/** Immutable creation-time manager identity, never modified after commitCareer. */
export class ManagerProfileView extends Schema.Class<ManagerProfileView>("ManagerProfileView")({
  managerName: Schema.String,
  archetypeOrigin: ManagerArchetypeSchema,
  pillars: PillarDistribution,
}) {}

export class ManagerProfileNotFoundError extends Schema.TaggedError<ManagerProfileNotFoundError>()(
  "ManagerProfileNotFoundError",
  {},
) {}

export class InvalidPillarDistributionError extends Schema.TaggedError<InvalidPillarDistributionError>()(
  "InvalidPillarDistributionError",
  {
    errors: Schema.Array(Schema.String),
  },
) {}

/** Manager Profile screen (Screen 19). Profile identity plus the three save-scoped facts that frame
 * it — club, Season number, tenure length — and the Archived Save flag the status badge keys off.
 * Deliberately carries no Board Objective, Verdict, Consecutive-Miss Counter, or `ManagerOutcome`:
 * those are season-boundary judgments owned exclusively by Season Summary. */
export class ManagerProfileScreenView extends Schema.Class<ManagerProfileScreenView>(
  "ManagerProfileScreenView",
)({
  profile: ManagerProfileView,
  clubName: Schema.String,
  seasonNumber: Schema.Finite,
  /** Seasons served with this club, counting the current one. */
  tenureSeasons: Schema.Finite,
  /** True once the save is an Archived Save (sacked or retired) — the badge and every guard key off
   * this single flag, never off the cause. */
  archived: Schema.Boolean,
}) {}

// ---------------------------------------------------------------------------
// Club selection (ticket 04)
// ---------------------------------------------------------------------------

export const SquadQualityBandSchema = Schema.Literals(SQUAD_QUALITY_BANDS);

/** One line of the detail panel's top-five readout: the player's name and the Position they are
 * strongest in. Deliberately not a `SquadPlayerView` — no raw player object crosses this boundary,
 * because the panel needs a name and a Position, not twenty attributes. */
export class ClubSelectionTopPlayer extends Schema.Class<ClubSelectionTopPlayer>("ClubSelectionTopPlayer")({
  name: Schema.String,
  position: PositionSchema,
  overallRating: Schema.Finite,
}) {}

/** The detail panel's squad readout, computed at query time from the squad `getClubSelection`
 * already loads to derive Squad Quality. It ships with every row rather than behind a per-club
 * call, so selecting a club fills the panel with no second fetch and no loading state. */
export class ClubSelectionDetail extends Schema.Class<ClubSelectionDetail>("ClubSelectionDetail")({
  squadSize: Schema.Finite,
  averageAge: Schema.Finite,
  topPlayers: Schema.Array(ClubSelectionTopPlayer),
}) {}

export class ClubSelectionRow extends Schema.Class<ClubSelectionRow>("ClubSelectionRow")({
  clubId: ClubId,
  clubName: Schema.String,
  statureTier: StatureTierSchema,
  boardObjectiveMin: Schema.Finite,
  boardObjectiveMax: Schema.Finite,
  squadQualityBand: SquadQualityBandSchema,
  transferBudget: Schema.Finite,
  wageBudget: Schema.Finite,
  detail: ClubSelectionDetail,
}) {}

export class ClubSelectionView extends Schema.Class<ClubSelectionView>("ClubSelectionView")({
  clubs: Schema.Array(ClubSelectionRow),
  /** The name of the League these clubs play in, already resolved through the save's content pack.
   *  Carried on the wire rather than imported by the renderer: a display name is the pack's to
   *  decide, and the renderer must never hold a second copy of that answer. */
  leagueName: Schema.String,
}) {}

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
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, Schema.Finite])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(Schema.Finite)])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(Schema.Finite)])),
});

export class SquadPlayerView extends Schema.Class<SquadPlayerView>("SquadPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  dateOfBirth: Schema.String,
  age: Schema.Finite,
  attributes: AttributesSchema,
  positions: Schema.Array(PlayerPositionView),
  overallRating: Schema.Finite,
  positionRatings: Schema.Record(Schema.String, Schema.Finite),
  /** The player's current Condition (%) from the Season's fitness ledger (ticket 10) — below 100
   * means they carry a shortfall from a recent heavy fixture/injury that hasn't fully recovered. */
  condition: Schema.Finite,
  /** The player's Training Focus Category, or `null` for the no-focus default (Training Focus).
   * A missing persisted value reads as `null` — no migration/backfill. */
  trainingFocus: NullableTrainingFocusSchema,
}) {}

export class ClubSummary extends Schema.Class<ClubSummary>("ClubSummary")({
  id: ClubId,
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
  playerId: PlayerId,
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
  seasonNumber: Schema.Finite,
  currentMatchday: Schema.Finite,
  phase: SeasonPhaseSchema,
}) {}

export class FixtureView extends Schema.Class<FixtureView>("FixtureView")({
  id: FixtureId,
  matchday: Schema.Finite,
  homeClubId: ClubId,
  homeClubName: Schema.String,
  awayClubId: ClubId,
  awayClubName: Schema.String,
  homeGoals: Schema.NullOr(Schema.Finite),
  awayGoals: Schema.NullOr(Schema.Finite),
  played: Schema.Boolean,
}) {}

export class FixturesView extends Schema.Class<FixturesView>("FixturesView")({
  season: SeasonView,
  fixtures: Schema.Array(FixtureView),
}) {}

/** One League Table row — points → goal difference → goals scored tie-break order (ADR-0004),
 * no head-to-head. */
export class LeagueTableRow extends Schema.Class<LeagueTableRow>("LeagueTableRow")({
  clubId: ClubId,
  clubName: Schema.String,
  played: Schema.Finite,
  won: Schema.Finite,
  drawn: Schema.Finite,
  lost: Schema.Finite,
  goalsFor: Schema.Finite,
  goalsAgainst: Schema.Finite,
  goalDifference: Schema.Finite,
  points: Schema.Finite,
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
  resolvedMatchday: Schema.NullOr(Schema.Finite),
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
    saveId: SaveId,
  },
) {}

/** Raised by any mutating command once the save is an Archived Save — `ManagerSacked` (ADR-0006 /
 * ticket 18) or `ManagerRetired` (ticket 02). Read-only from that point on, no re-hire flow. Carries
 * the cause because the renderer turns this error into player-facing copy, and "you have been
 * sacked" is the wrong sentence for a save the player retired from. */
export class SaveArchivedError extends Schema.TaggedError<SaveArchivedError>()("SaveArchivedError", {
  saveId: SaveId,
  cause: ArchivedCauseSchema,
}) {}

/** The player's club's Board Objective for one Season (ticket 18 / ADR-0006) — `finalPosition`/
 * `verdict` are `null` until `SeasonConcluded` triggers `BoardObjectiveJudged`. */
export class BoardObjectiveView extends Schema.Class<BoardObjectiveView>("BoardObjectiveView")({
  seasonNumber: Schema.Finite,
  clubId: ClubId,
  minPosition: Schema.Finite,
  maxPosition: Schema.Finite,
  finalPosition: Schema.NullOr(Schema.Finite),
  verdict: Schema.NullOr(VerdictSchema),
}) {}

/** Season summary screen (ticket 18): final League Table position, the Board Objective Verdict, and
 * (if applicable) the warning/sacking outcome and the running Consecutive-Miss Counter. */
export class SeasonSummaryView extends Schema.Class<SeasonSummaryView>("SeasonSummaryView")({
  season: SeasonView,
  standings: Schema.Array(LeagueTableRow),
  clubId: ClubId,
  clubName: Schema.String,
  finalPosition: Schema.NullOr(Schema.Finite),
  boardObjective: Schema.NullOr(BoardObjectiveView),
  managerOutcome: ManagerOutcomeSchema,
  consecutiveMisses: Schema.Finite,
  /** Which cause ended the career, or `null` while it is live — the renderer picks its closing
   * message from the cause rather than inferring one from `managerOutcome`, which is a board
   * judgment and says nothing about a retirement. */
  archivedCause: Schema.NullOr(ArchivedCauseSchema),
}) {}

export class ClubNotFoundError extends Schema.TaggedError<ClubNotFoundError>()("ClubNotFoundError", {
  id: ClubId,
}) {}

export class MatchNotFoundError extends Schema.TaggedError<MatchNotFoundError>()("MatchNotFoundError", {
  matchId: MatchId,
}) {}

/** A Match Decider stream is keyed by a fresh matchId (ADR-0007); ticket 15's fixture list exists
 * separately, so `startMatch` (ticket 13) lets the player pick any other club as a stand-in
 * opponent for a manual friendly — see `listOpponentClubs`. */
export class MatchSummary extends Schema.Class<MatchSummary>("MatchSummary")({
  matchId: MatchId,
  homeClubId: ClubId,
  homeClubName: Schema.String,
  awayClubId: ClubId,
  awayClubName: Schema.String,
}) {}

/** One rendered Commentary Line (ADR-0008) — minute is a separate field, never baked into `text`. */
export class CommentaryLineView extends Schema.Class<CommentaryLineView>("CommentaryLineView")({
  minute: Schema.Finite,
  tag: Schema.String,
  text: Schema.String,
}) {}

/** Per-club substitution cap status (ticket 14: 5 subs / 3 windows, halftime doesn't count as a
 * window — see `computeSubstitutionStatus` in `apps/desktop/src/main/match.ts`) — lets the UI
 * disable the substitution control and show subs used/remaining without guessing at the engine's
 * cap enforcement (which otherwise just silently no-ops an over-cap `MakeSubstitution`). */
export class SubstitutionStatusView extends Schema.Class<SubstitutionStatusView>("SubstitutionStatusView")({
  used: Schema.Finite,
  remaining: Schema.Finite,
  windowsUsed: Schema.Finite,
  windowsRemaining: Schema.Finite,
  capReached: Schema.Boolean,
}) {}

/** A typed `Injury` Match Event, so the renderer's commentary/indicators and the no-subs prompts
 * consume the same typed data the engine emits (ticket 08/07) — no separate representation. */
export class InjuryView extends Schema.Class<InjuryView>("InjuryView")({
  minute: Schema.Finite,
  teamClubId: ClubId,
  playerId: PlayerId,
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
  matchId: MatchId,
  cursor: Schema.Finite,
  isComplete: Schema.Boolean,
  homeScore: Schema.Finite,
  awayScore: Schema.Finite,
  lines: Schema.Array(CommentaryLineView),
  homeSubs: SubstitutionStatusView,
  awaySubs: SubstitutionStatusView,
  injuredClubIds: Schema.Array(Schema.String),
  injuries: Schema.Array(InjuryView),
  /** On-pitch head-counts for both clubs as of this chunk (ticket 11) — a value below 11 means
   * the team is playing with 10 (an empty slot / forced-off), surfacing the no-subs fallback. */
  homeOnPitchCount: Schema.Finite,
  awayOnPitchCount: Schema.Finite,
  /** Per-player Condition (%) at full time, keyed by playerId across both teams (ticket 02). */
  conditions: Schema.Record(Schema.String, Schema.Finite),
}) {}

/** `SubmitMatchCommand` (ticket 14) payload shapes — structurally identical to game-engine's
 * `ChangeTacticsCommand`/`MakeSubstitutionCommand` (`packages/game-engine/src/match/commands.ts`),
 * duplicated here rather than imported so `@cm-clone/contracts` stays decoupled from
 * `@cm-clone/game-engine` (same rationale as `MatchTactic` aliasing `Tactic` the other way). */
export class ChangeTacticsCommandPayload extends Schema.Class<ChangeTacticsCommandPayload>(
  "ChangeTacticsCommandPayload",
)({
  _tag: Schema.Literal("ChangeTactics"),
  clubId: ClubId,
  tactic: Tactic,
}) {}

export class MakeSubstitutionCommandPayload extends Schema.Class<MakeSubstitutionCommandPayload>(
  "MakeSubstitutionCommandPayload",
)({
  _tag: Schema.Literal("MakeSubstitution"),
  clubId: ClubId,
  outPlayerId: PlayerId,
  inPlayerId: PlayerId,
}) {}

/** `ForceOff` (ticket 11): manager drags an on-pitch player off to 10 men (no-subs bring-off) —
 * structurally identical to game-engine's `ForceOffCommand` (`packages/game-engine/src/match/
 * commands.ts`), duplicated here to keep `@cm-clone/contracts` decoupled from `@cm-clone/game-engine`. */
export class ForceOffCommandPayload extends Schema.Class<ForceOffCommandPayload>("ForceOffCommandPayload")({
  _tag: Schema.Literal("ForceOff"),
  clubId: ClubId,
  playerId: PlayerId,
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

// ---------------------------------------------------------------------------
// Player Development & Training Focus (spec: `.scratch/training/spec.md`)
// ---------------------------------------------------------------------------

/** The `PlayerDeveloped` event the Club Decider emits once per `SeasonConcluded` (per club),
 * carrying every player's resulting Attribute set — a development *outcome*, distinct from the
 * between-season state change `TrainingFocusSet`. */
export class PlayerDevelopedEvent extends Schema.Class<PlayerDevelopedEvent>("PlayerDevelopedEvent")({
  seasonNumber: Schema.Finite,
  clubId: ClubId,
  players: Schema.Array(
    Schema.Struct({
      playerId: PlayerId,
      attributes: AttributesSchema,
    }),
  ),
}) {}

/** The `TrainingFocusSet` event a manager's `SetTrainingFocus` command appends to the player's club
 * stream — a between-season state change, distinct from `PlayerDeveloped`. */
export class TrainingFocusSetEvent extends Schema.Class<TrainingFocusSetEvent>("TrainingFocusSetEvent")({
  seasonNumber: Schema.Finite,
  playerId: PlayerId,
  focus: NullableTrainingFocusSchema,
}) {}

/** The `SetTrainingFocus` command's result — the player's (possibly cleared) focus after the write. */
export class TrainingFocusView extends Schema.Class<TrainingFocusView>("TrainingFocusView")({
  playerId: PlayerId,
  focus: NullableTrainingFocusSchema,
}) {}

/** Raised when `SetTrainingFocus` targets a player who isn't on the user's own club — Training
 * Focus is a manager's own-squad lever, never a cross-club command. */
export class NotYourPlayerError extends Schema.TaggedError<NotYourPlayerError>()("NotYourPlayerError", {
  playerId: PlayerId,
}) {}

// ---------------------------------------------------------------------------
// Key binding overrides (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 6 / ticket 14)
// ---------------------------------------------------------------------------

/** Rejection reasons for `SetKeyBindingOverride` (ticket 14). The renderer's override validator
 *  (`apps/desktop/src/renderer/actions/overrides.ts`) is the enforcement point and produces these
 *  tagged errors; main re-checks the string-level guards (shape, locked key) before persisting, so
 *  they also cross the wire as typed failures. The renderer/help-overlay renders the reason from
 *  the tag + payload. */

/** Raised when the target Action's effective binding is a locked infra key (`Escape`,
 *  `Primary+K`, `Primary+/`, `Enter`) — the architectural keys are non-rebindable (ticket 14) —
 *  or when the *new* binding *is* one of those keys (nothing else may claim them). */
export class LockedKeyOverrideError extends Schema.TaggedError<LockedKeyOverrideError>()(
  "LockedKeyOverrideError",
  {
    actionId: Schema.String,
    binding: Schema.String,
  },
) {}

/** Raised when the new binding equals the effective binding of a *different* Action live in the
 *  same scope tier — the conflicting Action is named so the rejection can say which one. */
export class CollidingOverrideError extends Schema.TaggedError<CollidingOverrideError>()(
  "CollidingOverrideError",
  {
    actionId: Schema.String,
    binding: Schema.String,
    conflictingActionId: Schema.String,
  },
) {}

/** Raised when the binding string is not a shape the keyboard framework can express (a bare key,
 *  a `Primary+` chord, a `g <key>` two-step, or `Space`) — e.g. `Enter`-free modifiers, arrows,
 *  function keys, or a lone `g` (the prefix initiator is reserved). */
export class InvalidBindingShapeError extends Schema.TaggedError<InvalidBindingShapeError>()(
  "InvalidBindingShapeError",
  {
    actionId: Schema.String,
    binding: Schema.String,
  },
) {}

// ---------------------------------------------------------------------------
// League and Nation Selection (Screen 3)
// ---------------------------------------------------------------------------

/**
 * Setup-scope identifiers. Branded for the same reason `SaveId`/`ClubId` are: `resolveLeagueSelection`
 * takes a Nation id and a League Scope Option id side by side, and without the brand the two
 * transposed is a well-typed call that resolves to the wrong career.
 */
export const RegionId = Schema.String.pipe(Schema.brand("RegionId"));
export type RegionId = Schema.Schema.Type<typeof RegionId>;

export const NationId = Schema.String.pipe(Schema.brand("NationId"));
export type NationId = Schema.Schema.Type<typeof NationId>;

export const CompetitionId = Schema.String.pipe(Schema.brand("CompetitionId"));
export type CompetitionId = Schema.Schema.Type<typeof CompetitionId>;

export const ScopeOptionId = Schema.String.pipe(Schema.brand("ScopeOptionId"));
export type ScopeOptionId = Schema.Schema.Type<typeof ScopeOptionId>;

export const SnapshotId = Schema.String.pipe(Schema.brand("SnapshotId"));
export type SnapshotId = Schema.Schema.Type<typeof SnapshotId>;

export const SimulationModeSchema = Schema.Literals(SIMULATION_MODES);
export const IntentSourceSchema = Schema.Literals(INTENT_SOURCES);
export const IssueLevelSchema = Schema.Literals(ISSUE_LEVELS);
export const IssueCodeSchema = Schema.Literals(ISSUE_CODES);
export const SimulationSpeedRatingSchema = Schema.Literals(SIMULATION_SPEED_RATINGS);
export const CompetitionKindSchema = Schema.Literals(["league", "cup", "reserve", "continental"]);
export const NationSelectionStateSchema = Schema.Literals(NATION_SELECTION_STATES);

/** One Competition as the renderer sees it. `name` has already passed `sanitizeLabel` in main —
 *  the renderer receives display text it can render, never a raw database label (§23). */
export class CompetitionRow extends Schema.Class<CompetitionRow>("CompetitionRow")({
  id: CompetitionId,
  nationId: NationId,
  name: Schema.String,
  kind: CompetitionKindSchema,
  tier: Schema.NullOr(Schema.Finite),
  requires: Schema.Array(CompetitionId),
  clubCount: Schema.Finite,
  /** Per-season match load, the input the processing-cost meter is derived from. Carried on the
   *  wire so the Active Leagues renderer can compute the ticket-02 consequences (entity count,
   *  processing cost) faithfully from the catalogue it already reads — without it, a renderer-side
   *  derivation would have to stub a number the estimate depends on. */
  annualMatches: Schema.Finite,
  playableSupported: Schema.Boolean,
}) {}

export class ScopeOptionRow extends Schema.Class<ScopeOptionRow>("ScopeOptionRow")({
  id: ScopeOptionId,
  nationId: NationId,
  displayName: Schema.String,
  playableCompetitionIds: Schema.Array(CompetitionId),
  backgroundCompetitionIds: Schema.Array(CompetitionId),
}) {}

export class NationRow extends Schema.Class<NationRow>("NationRow")({
  id: NationId,
  /** ISO 3166-1 alpha-3. Carried through to the renderer because it is the stable key for
   *  presentation the catalogue does not own — a flag, a localized country name — and deriving it
   *  from the display name in the UI would put a lookup on a licensed, replaceable string. */
  code: Schema.String,
  confederationId: Schema.String,
  regionId: RegionId,
  name: Schema.String,
  alternativeNames: Schema.Array(Schema.String),
  available: Schema.Boolean,
  playableSupported: Schema.Boolean,
  recommendedScopeOptionId: Schema.NullOr(ScopeOptionId),
  scopeOptions: Schema.Array(ScopeOptionRow),
  competitions: Schema.Array(CompetitionRow),
}) {}

export class RegionRow extends Schema.Class<RegionRow>("RegionRow")({
  id: RegionId,
  name: Schema.String,
}) {}

/** The catalogue the browser renders. Read-only and identical for every career started against
 *  the same database, so it is fetched once when the screen mounts. */
export class LeagueSetupIndexView extends Schema.Class<LeagueSetupIndexView>("LeagueSetupIndexView")({
  fingerprint: Schema.String,
  databaseName: Schema.String,
  databaseVersion: Schema.String,
  regions: Schema.Array(RegionRow),
  nations: Schema.Array(NationRow),
}) {}

/** One command from the renderer. Narrow by construction: a Nation, a mode, and optionally the
 *  scope option — never a Competition graph the renderer assembled itself (§22, §34). */
export class NationSelectionIntentPayload extends Schema.Class<NationSelectionIntentPayload>(
  "NationSelectionIntentPayload",
)({
  nationId: NationId,
  mode: SimulationModeSchema,
  scopeOptionId: Schema.optional(ScopeOptionId),
  source: IntentSourceSchema,
}) {}

/** The advanced options from the Active Leagues setup screen (§"Advanced options ship only where
 *  a real system exists"). Four categories, each validated against its legal value set at the
 *  boundary. `version` lets the persisted draft refuse a future shape rather than misread it;
 *  staff generation and editor/developer capabilities are future slots and carry no value here. */
export class AdvancedOptionsPayload extends Schema.Class<AdvancedOptionsPayload>(
  "AdvancedOptionsPayload",
)({
  version: Schema.Literal(ADVANCED_OPTIONS_VERSION),
  matchSimulationDetail: Schema.Literals(MATCH_SIMULATION_DETAILS),
  transferMarketActivity: Schema.Literals(TRANSFER_MARKET_ACTIVITIES),
  rosterGenerationDetail: Schema.Literals(ROSTER_GENERATION_DETAILS),
  informationVisibility: Schema.Literals(INFORMATION_VISIBILITIES),
}) {}

export class SelectionIssueRow extends Schema.Class<SelectionIssueRow>("SelectionIssueRow")({
  code: IssueCodeSchema,
  level: IssueLevelSchema,
  message: Schema.String,
  nationId: Schema.NullOr(NationId),
  competitionIds: Schema.Array(CompetitionId),
}) {}

export class EffectiveNationSelectionRow extends Schema.Class<EffectiveNationSelectionRow>(
  "EffectiveNationSelectionRow",
)({
  nationId: NationId,
  mode: SimulationModeSchema,
  scopeOptionId: Schema.optional(ScopeOptionId),
  playableCompetitionIds: Schema.Array(CompetitionId),
  backgroundCompetitionIds: Schema.Array(CompetitionId),
  viewOnlyCompetitionIds: Schema.Array(CompetitionId),
  dependencyCompetitionIds: Schema.Array(CompetitionId),
}) {}

export class DependencyRow extends Schema.Class<DependencyRow>("DependencyRow")({
  competitionId: CompetitionId,
  mode: SimulationModeSchema,
  requiredBy: Schema.Array(CompetitionId),
  chosenDirectly: Schema.Boolean,
}) {}

export class CareerScopeEstimateView extends Schema.Class<CareerScopeEstimateView>(
  "CareerScopeEstimateView",
)({
  selectedNationCount: Schema.Finite,
  playableNationCount: Schema.Finite,
  backgroundNationCount: Schema.Finite,
  playableCompetitionCount: Schema.Finite,
  backgroundCompetitionCount: Schema.Finite,
  estimatedClubCount: Schema.Finite,
  estimatedPlayerCount: Schema.Finite,
  estimatedStaffCount: Schema.Finite,
  estimatedMemoryBytes: Schema.Finite,
  estimatedInitialSaveBytes: Schema.Finite,
  simulationSpeedRating: SimulationSpeedRatingSchema,
  confidence: Schema.Literals(["low", "medium", "high"]),
}) {}

/**
 * The answer to one resolve request. `selectionRevision` is echoed back unchanged: §11.5 requires
 * that only a result matching the current revision may update the UI, and echoing the request's
 * own revision is what lets the renderer discard a slow answer without a second clock.
 */
export class ResolvedSelectionView extends Schema.Class<ResolvedSelectionView>("ResolvedSelectionView")({
  selectionRevision: Schema.Finite,
  selections: Schema.Array(EffectiveNationSelectionRow),
  dependencies: Schema.Array(DependencyRow),
  issues: Schema.Array(SelectionIssueRow),
  estimate: CareerScopeEstimateView,
}) {}

/**
 * §17. The one immutable record `Continue` produces. It carries both what the user asked for and
 * what that resolved to, so a later setup stage never has to re-run resolution to know the scope,
 * and a database change between screens is detectable through `databaseFingerprint`.
 */
export class LeagueSelectionSnapshot extends Schema.Class<LeagueSelectionSnapshot>(
  "LeagueSelectionSnapshot",
)({
  id: SnapshotId,
  databaseFingerprint: Schema.String,
  createdAt: Schema.String,
  intents: Schema.Array(NationSelectionIntentPayload),
  selections: Schema.Array(EffectiveNationSelectionRow),
  dependencies: Schema.Array(DependencyRow),
  estimate: CareerScopeEstimateView,
}) {}

/** §18, §29. The resumable setup draft, saved on Back and on Continue. One per database
 *  fingerprint; a fingerprint change makes the stored draft inapplicable rather than wrong. */
export class SetupDraft extends Schema.Class<SetupDraft>("SetupDraft")({
  databaseFingerprint: Schema.String,
  savedAt: Schema.String,
  intents: Schema.Array(NationSelectionIntentPayload),
  searchQuery: Schema.String,
  regionFilterId: Schema.NullOr(RegionId),
  statusFilter: Schema.String,
  /**
   * The Active Leagues setup's advanced options, carried at their own version. Optional because
   * a draft written by the League & Nation browser has none, and because the options carry their
   * *own* version literal: a draft from an older options build restores its league intents and
   * falls back to the shipped defaults rather than being discarded whole.
   */
  advancedOptions: Schema.optional(AdvancedOptionsPayload),
}) {}

/** A user-saved preset (§13). Fingerprint-bound for the same reason the draft is. */
export class LeaguePreset extends Schema.Class<LeaguePreset>("LeaguePreset")({
  id: Schema.String,
  name: Schema.String,
  databaseFingerprint: Schema.String,
  savedAt: Schema.String,
  intents: Schema.Array(NationSelectionIntentPayload),
}) {}

/** §17. `Continue` refused: the selection did not survive revalidation in the trusted layer. The
 *  blocking issues travel with the error so the screen shows the same error summary it would have
 *  shown had the client noticed first. */
export class InvalidLeagueSelectionError extends Schema.TaggedError<InvalidLeagueSelectionError>()(
  "InvalidLeagueSelectionError",
  { issues: Schema.Array(SelectionIssueRow) },
) {}

/** §13, §30.4. A stored preset, setup draft, or League Selection Snapshot captured against a
 *  different database. Never migrated by guessing at similar names — the user is told and chooses
 *  again. Also the single typed failure `beginCareer` raises: the snapshot's catalogue fingerprint
 *  no longer matches the live Setup Catalogue, or the snapshot id names no snapshot at all
 *  (`found` then carries a descriptive marker such as "(snapshot not found)"). */
export class PresetFingerprintMismatchError extends Schema.TaggedError<PresetFingerprintMismatchError>()(
  "PresetFingerprintMismatchError",
  { expected: Schema.String, found: Schema.String },
) {}

/** §30.6. The setup draft could not be written. Non-blocking at the call site — the screen warns
 *  and lets the user continue rather than trapping them behind a disk problem. */
export class SetupDraftWriteError extends Schema.TaggedError<SetupDraftWriteError>()(
  "SetupDraftWriteError",
  { reason: Schema.String },
) {}

// ---------------------------------------------------------------------------
// News Inbox (Screens 24-26)
// ---------------------------------------------------------------------------

/** A message's identity is its position in the `events` log — `"<stream_type>:<stream_id>:<seq>"`.
 *  Nothing mints it, so a message id can never name an event that does not exist, and the same
 *  career event is the same message across reloads. Branded at the decode so a raw string cannot be
 *  passed where a message id is expected. */
export const NewsMessageId = Schema.String.pipe(Schema.brand("NewsMessageId"));
export type NewsMessageId = typeof NewsMessageId.Type;

/** The kinds of career event that carry news. Stable identifiers — filter state stores these, never
 *  display copy. Mirrors `NEWS_CATEGORIES` in `@cm-clone/shared`. */
export const NewsCategorySchema = Schema.Literals([
  "board",
  "season",
  "transfer",
  "result",
  "development",
]);
export type NewsCategory = typeof NewsCategorySchema.Type;

export const NewsPrioritySchema = Schema.Literals(["normal", "high"]);
export const NewsReadStateSchema = Schema.Literals(["unread", "read", "archived"]);

/** One projected message. Immutable and fully self-describing: the renderer never re-derives copy
 *  from a tag, so message text has exactly one source. */
export class NewsMessageView extends Schema.Class<NewsMessageView>("NewsMessageView")({
  messageId: NewsMessageId,
  category: NewsCategorySchema,
  priority: NewsPrioritySchema,
  state: NewsReadStateSchema,
  flagged: Schema.Boolean,
  subject: Schema.String,
  body: Schema.String,
  /** In-world position. The Calendar carries no dates yet, so these are what place a message in the
   *  career; `occurredAt` orders it. Either may be `null` for an event the field does not apply to. */
  seasonNumber: Schema.NullOr(Schema.Finite),
  matchday: Schema.NullOr(Schema.Finite),
  occurredAt: Schema.String,
}) {}

/** Counts over the whole inbox, never over the filtered result — narrowing the list must not move
 *  the header's unread count. `total` and `unread` exclude archived messages. */
export class NewsCountsView extends Schema.Class<NewsCountsView>("NewsCountsView")({
  total: Schema.Finite,
  unread: Schema.Finite,
  flagged: Schema.Finite,
  archived: Schema.Finite,
  highPriorityUnread: Schema.Finite,
}) {}

/** The News Inbox read model. Carries every message including archived ones: filtering is a
 *  renderer-side operation over an already-loaded career narrative (a few hundred rows over a
 *  twenty-season career), so narrowing the view never costs a round trip. */
export class NewsInboxView extends Schema.Class<NewsInboxView>("NewsInboxView")({
  messages: Schema.Array(NewsMessageView),
  counts: NewsCountsView,
}) {}

/** A message id that parses but names no event in this save. Raised rather than silently skipped:
 *  a bulk action that quietly dropped ids would report success over work it did not do. */
export class NewsMessageNotFoundError extends Schema.TaggedError<NewsMessageNotFoundError>()(
  "NewsMessageNotFoundError",
  { messageId: Schema.String },
) {}

/** A message id whose shape is not `"<stream_type>:<stream_id>:<seq>"`. Distinct from
 *  `NewsMessageNotFoundError` because a malformed id is a caller defect and a missing one is a
 *  stale renderer. */
export class MalformedNewsMessageIdError extends Schema.TaggedError<MalformedNewsMessageIdError>()(
  "MalformedNewsMessageIdError",
  { messageId: Schema.String },
) {}

/** The state change a bulk inbox action applies. Every field is optional and an omitted field is
 *  left alone, so "mark read" and "archive" are the same command with different fields set. */
export const NewsMessageStatePatch = Schema.Struct({
  read: Schema.optional(Schema.Boolean),
  archived: Schema.optional(Schema.Boolean),
  flagged: Schema.optional(Schema.Boolean),
});
