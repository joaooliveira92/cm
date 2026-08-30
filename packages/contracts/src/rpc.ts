import { Schema } from "effect";
import {
  AdvanceCalendarResult,
  BidderBidActionSchema,
  BidId,
  BidNotFoundError,
  BidView,
  ClubId,
  ClubNotFoundError,
  ClubSelectionView,
  ClubSummary,
  FixturesView,
  InsufficientTransferBudgetError,
  InvalidBidActionError,
  InvalidPillarDistributionError,
  InvalidTacticError,
  LeagueTableView,
  ManagerProfileView,
  ManagerArchetypeSchema,
  MatchCommandPayload,
  MatchId,
  MatchNotFoundError,
  MatchSummary,
  NotYourPlayerError,
  NullableTrainingFocusSchema,
  PillarDistribution,
  PlayerId,
  PlayerNotFoundError,
  PlayerNotFreeAgentError,
  ResumeSimulationView,
  SaveId,
  SaveNotFoundError,
  SaveSackedError,
  SaveSummary,
  SeasonCompleteError,
  SeasonSummaryView,
  SellerBidActionSchema,
  SquadView,
  Tactic,
  TacticsScreenView,
  TrainingFocusView,
  TransferWindowClosedError,
  TransfersScreenView,
  WageBudgetExceededError,
} from "./schemas.js";

/**
 * Hand-rolled stand-in for `@effect/rpc`'s RpcGroup: as of this writing
 * `@effect/rpc@latest` (0.76.2) peer-depends on `effect@^3.22.1` and has no
 * `rc`/`beta` release compatible with `effect@4.0.0-rc.x`. Every other
 * package in this monorepo is pinned to the v4 `rc` line, so this module
 * covers the same ground (schema-validated, typed methods over one
 * transport) without depending on a package that doesn't support v4 yet.
 * Swap this for `@effect/rpc`'s `RpcGroup` once it ships a v4-compatible
 * release.
 */
export const AppRpcs = {
  ping: {
    payload: Schema.Void,
    success: Schema.String,
    error: Schema.Never,
  },
  listSaves: {
    payload: Schema.Void,
    success: Schema.Array(SaveSummary),
    error: Schema.Never,
  },
  createSave: {
    payload: Schema.Struct({ name: Schema.String }),
    success: SaveSummary,
    error: Schema.Never,
  },
  beginCareer: {
    payload: Schema.Void,
    success: Schema.Struct({ id: SaveId }),
    error: Schema.Never,
  },
  commitCareer: {
    payload: Schema.Struct({
      id: SaveId,
      name: Schema.String,
      selectedClubId: ClubId,
      managerName: Schema.String,
      archetypeOrigin: ManagerArchetypeSchema,
      pillars: PillarDistribution,
    }),
    success: SaveSummary,
    error: Schema.Union([InvalidPillarDistributionError]),
  },
  getManagerProfile: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: ManagerProfileView,
    error: SaveNotFoundError,
  },
  getClubSelection: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: ClubSelectionView,
    error: Schema.Never,
  },
  discardCareer: {
    payload: Schema.Struct({ id: SaveId }),
    success: Schema.Void,
    error: Schema.Never,
  },
  loadSave: {
    payload: Schema.Struct({ id: SaveId }),
    success: SaveSummary,
    error: SaveNotFoundError,
  },
  getSquad: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: SquadView,
    error: SaveNotFoundError,
  },
  getTactics: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: TacticsScreenView,
    error: SaveNotFoundError,
  },
  changeTactics: {
    payload: Schema.Struct({ saveId: SaveId, tactic: Tactic }),
    success: TacticsScreenView,
    error: Schema.Union([SaveNotFoundError, InvalidTacticError, SaveSackedError]),
  },
  getLeagueTable: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: LeagueTableView,
    error: SaveNotFoundError,
  },
  getFixtures: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: FixturesView,
    error: SaveNotFoundError,
  },
  advanceCalendar: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: AdvanceCalendarResult,
    error: Schema.Union([SaveNotFoundError, SeasonCompleteError, SaveSackedError]),
  },
  getSeasonSummary: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: SeasonSummaryView,
    error: SaveNotFoundError,
  },
  listOpponentClubs: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: Schema.Array(ClubSummary),
    error: SaveNotFoundError,
  },
  startMatch: {
    payload: Schema.Struct({ saveId: SaveId, opponentClubId: ClubId }),
    success: MatchSummary,
    error: Schema.Union([SaveNotFoundError, ClubNotFoundError, SaveSackedError]),
  },
  resumeSimulation: {
    payload: Schema.Struct({ saveId: SaveId, matchId: MatchId, cursor: Schema.Finite }),
    success: ResumeSimulationView,
    error: Schema.Union([SaveNotFoundError, MatchNotFoundError]),
  },
  /** Ticket 14: appends a mid-match `ChangeTactics`/`MakeSubstitution` command to the Match
   * Decider's stream and returns the chunk of Commentary Lines from `cursor` on, resimulated with
   * the command applied (ADR-0007 chunked resimulation — full resimulation on every command is the
   * intended approach, not premature optimization to avoid, since `simulateMatch` is pure and
   * sub-millisecond). `minute`/`isHalftime` place the command in `simulateMatch`'s
   * `commandsByMinute`/`halftimeCommands` inputs. */
  submitMatchCommand: {
    payload: Schema.Struct({
      saveId: SaveId,
      matchId: MatchId,
      cursor: Schema.Finite,
      minute: Schema.Finite,
      isHalftime: Schema.Boolean,
      command: MatchCommandPayload,
    }),
    success: ResumeSimulationView,
    error: Schema.Union([SaveNotFoundError, MatchNotFoundError, SaveSackedError]),
  },
  getTransfersScreen: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: TransfersScreenView,
    error: SaveNotFoundError,
  },
  placeBid: {
    payload: Schema.Struct({ saveId: SaveId, playerId: PlayerId, amount: Schema.Finite }),
    success: BidView,
    error: Schema.Union([
      SaveNotFoundError,
      PlayerNotFoundError,
      TransferWindowClosedError,
      InsufficientTransferBudgetError,
      WageBudgetExceededError,
      InvalidBidActionError,
      SaveSackedError,
    ]),
  },
  respondToBid: {
    payload: Schema.Struct({
      saveId: SaveId,
      bidId: BidId,
      action: SellerBidActionSchema,
      counterAmount: Schema.optional(Schema.Finite),
    }),
    success: TransfersScreenView,
    error: Schema.Union([
      SaveNotFoundError,
      BidNotFoundError,
      TransferWindowClosedError,
      InvalidBidActionError,
      InsufficientTransferBudgetError,
      WageBudgetExceededError,
      SaveSackedError,
    ]),
  },
  respondAsBidder: {
    payload: Schema.Struct({
      saveId: SaveId,
      bidId: BidId,
      action: BidderBidActionSchema,
    }),
    success: TransfersScreenView,
    error: Schema.Union([
      SaveNotFoundError,
      BidNotFoundError,
      TransferWindowClosedError,
      InvalidBidActionError,
      InsufficientTransferBudgetError,
      WageBudgetExceededError,
      SaveSackedError,
    ]),
  },
  signFreeAgent: {
    payload: Schema.Struct({ saveId: SaveId, playerId: PlayerId, years: Schema.optional(Schema.Finite) }),
    success: TransfersScreenView,
    error: Schema.Union([
      SaveNotFoundError,
      PlayerNotFoundError,
      PlayerNotFreeAgentError,
      TransferWindowClosedError,
      WageBudgetExceededError,
      SaveSackedError,
    ]),
  },
  renewContract: {
    payload: Schema.Struct({ saveId: SaveId, playerId: PlayerId, years: Schema.optional(Schema.Finite) }),
    success: TransfersScreenView,
    error: Schema.Union([
      SaveNotFoundError,
      PlayerNotFoundError,
      InvalidBidActionError,
      TransferWindowClosedError,
      WageBudgetExceededError,
      SaveSackedError,
    ]),
  },
  /** Training Focus (spec: `.scratch/training/spec.md`): set (or clear, with `focus: null`) a
   * player's focused Category on the user's own club. Changeable at any point — no window or
   * season-boundary restriction. */
  setTrainingFocus: {
    payload: Schema.Struct({
      saveId: SaveId,
      playerId: PlayerId,
      focus: NullableTrainingFocusSchema,
    }),
    success: TrainingFocusView,
    error: Schema.Union([SaveNotFoundError, PlayerNotFoundError, NotYourPlayerError, SaveSackedError]),
  },
} as const;

export type AppRpcMethod = keyof typeof AppRpcs;

export type RpcPayload<M extends AppRpcMethod> = Schema.Schema.Type<
  (typeof AppRpcs)[M]["payload"]
>;
export type RpcSuccess<M extends AppRpcMethod> = Schema.Schema.Type<
  (typeof AppRpcs)[M]["success"]
>;
export type RpcFailure<M extends AppRpcMethod> = Schema.Schema.Type<
  (typeof AppRpcs)[M]["error"]
>;

export const RPC_CHANNEL = "cm-clone:rpc";

export interface RpcEnvelope<M extends AppRpcMethod = AppRpcMethod> {
  readonly method: M;
  readonly payload: unknown;
}

export type RpcResult<M extends AppRpcMethod> =
  | { readonly _tag: "Success"; readonly value: RpcSuccess<M> }
  | { readonly _tag: "Failure"; readonly error: unknown };
