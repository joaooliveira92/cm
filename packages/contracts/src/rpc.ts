import { Schema } from "effect";
import {
  AdvanceCalendarResult,
  AdvancedOptionsPayload,
  BidderBidActionSchema,
  BidId,
  BidNotFoundError,
  CareerScopeEstimateView,
  InvalidLeagueSelectionError,
  LeaguePreset,
  LeagueSelectionSnapshot,
  LeagueSetupIndexView,
  NationSelectionIntentPayload,
  PresetFingerprintMismatchError,
  ResolvedSelectionView,
  SetupDraft,
  SetupDraftWriteError,
  SnapshotId,
  BidView,
  ClubId,
  ClubNotFoundError,
  ClubSelectionView,
  ClubSummary,
  CollidingOverrideError,
  FixturesView,
  InsufficientTransferBudgetError,
  InvalidBidActionError,
  InvalidBindingShapeError,
  InvalidPillarDistributionError,
  InvalidTacticError,
  LeagueTableView,
  LockedKeyOverrideError,
  ManagerProfileScreenView,
  ManagerProfileView,
  ManagerArchetypeSchema,
  MatchCommandPayload,
  MatchId,
  MalformedNewsMessageIdError,
  MatchNotFoundError,
  MatchSummary,
  NewsInboxView,
  NewsMessageId,
  NewsMessageNotFoundError,
  NewsMessageStatePatch,
  NotYourPlayerError,
  NullableTrainingFocusSchema,
  PillarDistribution,
  PlayerId,
  PlayerNotFoundError,
  PlayerNotFreeAgentError,
  ResumeSimulationView,
  SaveArchivedError,
  SaveId,
  SaveNotFoundError,
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
  /** Generate a provisional world from the League Selection Snapshot the player submitted. The
   *  snapshot is loaded by id in main and refused — before any save file exists — when its
   *  catalogue fingerprint no longer matches the live Setup Catalogue, or when the id names no
   *  snapshot at all (the caller's recovery is to re-run selection). */
  beginCareer: {
    payload: Schema.Struct({ snapshotId: SnapshotId }),
    success: Schema.Struct({ id: SaveId }),
    error: PresetFingerprintMismatchError,
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
    error: Schema.Union([InvalidPillarDistributionError, ClubNotFoundError]),
  },
  getManagerProfile: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: ManagerProfileView,
    error: SaveNotFoundError,
  },
  /** Manager Profile screen (Screen 19) — identity plus club/season/tenure and the Archived flag. */
  getManagerProfileScreen: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: ManagerProfileScreenView,
    error: SaveNotFoundError,
  },
  /** `RetireManager` (ticket 02 / Screen 20): the player ends their own career from the Manager
   * Profile screen. Appends `ManagerRetired` to the season stream and archives the save with cause
   * `"retired"`. Irreversible, and rejected by the same `SaveArchivedError` guard every other
   * mutating command carries, so retiring twice is not possible. Returns nothing — the renderer
   * navigates back to the Save List, where the save now reads as archived. */
  retireManager: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: Schema.Void,
    error: Schema.Union([SaveNotFoundError, SaveArchivedError]),
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
    error: Schema.Union([SaveNotFoundError, InvalidTacticError, SaveArchivedError]),
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
    error: Schema.Union([SaveNotFoundError, SeasonCompleteError, SaveArchivedError]),
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
    error: Schema.Union([SaveNotFoundError, ClubNotFoundError, SaveArchivedError]),
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
    error: Schema.Union([SaveNotFoundError, MatchNotFoundError, SaveArchivedError]),
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
      SaveArchivedError,
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
      SaveArchivedError,
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
      SaveArchivedError,
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
      SaveArchivedError,
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
      SaveArchivedError,
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
    error: Schema.Union([SaveNotFoundError, PlayerNotFoundError, NotYourPlayerError, SaveArchivedError]),
  },
  /** Key binding overrides (ticket 14 / Stage 6): a machine-local `record<ActionId, binding>`
   * layered over — never replacing — the coded defaults. The file lives in Electron `userData`
   * (`keybindings.json`, a sibling of `saves/`) and is owned by main; the renderer never touches
   * the filesystem, and no binding ever enters a save, the event stream, or a migration. */
  getKeyBindingOverrides: {
    payload: Schema.Void,
    success: Schema.Record(Schema.String, Schema.String),
    error: Schema.Never,
  },
  /** Rebinds one Action to `binding` (replacing the whole binding string — a two-step `g <key>` is
   * rebound as one entry; the prefix mechanism itself is unchanged). Returns the updated override
   * map. Rejected for locked infra keys, collisions (the conflicting Action named), and shapes the
   * keyboard framework cannot express. */
  setKeyBindingOverride: {
    payload: Schema.Struct({
      actionId: Schema.String,
      binding: Schema.String,
    }),
    success: Schema.Record(Schema.String, Schema.String),
    error: Schema.Union([LockedKeyOverrideError, CollidingOverrideError, InvalidBindingShapeError]),
  },
  /** Removes one Action's override, returning it to its coded default. Returns the updated map. */
  resetKeyBinding: {
    payload: Schema.Struct({ actionId: Schema.String }),
    success: Schema.Record(Schema.String, Schema.String),
    error: Schema.Never,
  },
  /** Drops every override; the map returns to empty (all coded defaults). Returns the updated map. */
  resetAllKeyBindings: {
    payload: Schema.Void,
    success: Schema.Record(Schema.String, Schema.String),
    error: Schema.Never,
  },
  // -------------------------------------------------------------------------
  // League and Nation Selection (Screen 3)
  // -------------------------------------------------------------------------

  /** The validated setup catalogue: regions, Nations, League Scope Options, and the dependency
   * edges between Competitions. Read once when the screen mounts — it does not change while the
   * screen is open, so nothing re-fetches it on selection changes. Labels arrive sanitized. */
  getLeagueSetupIndex: {
    payload: Schema.Void,
    success: LeagueSetupIndexView,
    error: Schema.Never,
  },
  /** Resolve a set of intents into the effective selection, its dependencies, its issues, and its
   * cost estimate. The renderer calls this on every (debounced) selection change and discards any
   * answer whose echoed `selectionRevision` is not the current one (§11.5).
   *
   * This is the *trusted* resolver: it validates every id against the catalogue, so a forged or
   * stale payload produces issues rather than a selection. It never fails — an invalid selection
   * is a value with blocking issues, because the screen has to render exactly that. */
  resolveLeagueSelection: {
    payload: Schema.Struct({
      selectionRevision: Schema.Finite,
      intents: Schema.Array(NationSelectionIntentPayload),
    }),
    success: ResolvedSelectionView,
    error: Schema.Never,
  },
  /** `Continue`. Revalidates from the intents rather than trusting anything the renderer resolved,
   * then creates one immutable `LeagueSelectionSnapshot` and saves the setup draft alongside it.
   * Idempotent per identical intent set: a double activation returns the snapshot the first one
   * created rather than minting a second (§17.2). */
  submitLeagueSelection: {
    payload: Schema.Struct({
      intents: Schema.Array(NationSelectionIntentPayload),
    }),
    success: LeagueSelectionSnapshot,
    error: InvalidLeagueSelectionError,
  },
  /** The snapshot a previous `submitLeagueSelection` produced, or `null`. Read by the later setup
   * stages so they never re-resolve the scope for themselves. */
  getLeagueSelectionSnapshot: {
    payload: Schema.Struct({ id: SnapshotId }),
    success: Schema.NullOr(LeagueSelectionSnapshot),
    error: Schema.Never,
  },
  /** §18, §29. Persist the resumable setup draft. Called on Back and before navigating forward. */
  saveSetupDraft: {
    payload: Schema.Struct({
      intents: Schema.Array(NationSelectionIntentPayload),
      searchQuery: Schema.String,
      regionFilterId: Schema.NullOr(Schema.String),
      statusFilter: Schema.String,
      /** The Active Leagues setup's advanced options. Absent from a draft the League & Nation
       *  browser writes, which has no advanced options to carry. */
      advancedOptions: Schema.optional(AdvancedOptionsPayload),
    }),
    success: Schema.Void,
    error: SetupDraftWriteError,
  },
  /** The stored draft, or `null` when there is none or it was captured against a different
   * database. A stale draft is discarded here rather than surfaced for the renderer to judge. */
  loadSetupDraft: {
    payload: Schema.Void,
    success: Schema.NullOr(SetupDraft),
    error: Schema.Never,
  },
  /** §6.1, §13. Intents for a built-in configuration, computed against the catalogue and this
   * machine's capability — never a hardcoded id list. */
  buildLeaguePreset: {
    payload: Schema.Struct({ preset: Schema.Literals(["recommended", "minimal", "broad_world"]) }),
    success: Schema.Struct({
      intents: Schema.Array(NationSelectionIntentPayload),
      estimate: CareerScopeEstimateView,
    }),
    error: Schema.Never,
  },
  /** The user's saved presets for the current database. Presets stored against another database
   * fingerprint are omitted, not offered-then-rejected. */
  listLeaguePresets: {
    payload: Schema.Void,
    success: Schema.Array(LeaguePreset),
    error: Schema.Never,
  },
  saveLeaguePreset: {
    payload: Schema.Struct({
      name: Schema.String,
      intents: Schema.Array(NationSelectionIntentPayload),
    }),
    success: LeaguePreset,
    error: SetupDraftWriteError,
  },
  /** Apply a stored preset. Fails rather than partially applying when the fingerprint does not
   * match; drops individual entries the catalogue no longer contains and reports them (§31.4). */
  applyLeaguePreset: {
    payload: Schema.Struct({ id: Schema.String }),
    success: Schema.Struct({
      intents: Schema.Array(NationSelectionIntentPayload),
      droppedNationIds: Schema.Array(Schema.String),
      droppedScopeOptionIds: Schema.Array(Schema.String),
    }),
    error: PresetFingerprintMismatchError,
  },
  /** News Inbox (Screen 24) — the career's event streams read as messages, newest first, with the
   * whole-inbox counts the header shows. Returns every message including archived ones: a career's
   * narrative is a few hundred rows over twenty seasons, so the renderer filters what it already
   * holds rather than paying a round trip per view change. Pure read; safe on an archived save. */
  getNewsInbox: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: NewsInboxView,
    error: SaveNotFoundError,
  },
  /** Mark, flag, or archive one or more messages (Screen 24 §7 bulk actions, Screen 25's
   * open-marks-read). Idempotent: applying the same patch twice is a no-op, so a double submit is
   * harmless. Every id is validated before anything is written, so a bulk action either applies to
   * all of its messages or to none of them — a partial apply would report success over work it did
   * not do.
   *
   * Deliberately **not** guarded by `assertSaveNotArchived`. That guard protects simulation state,
   * and read/flagged/archived is user state on a projection; blocking it would leave the message
   * announcing a dismissal permanently unread on the save that dismissal archived. */
  setNewsMessageState: {
    payload: Schema.Struct({
      saveId: SaveId,
      messageIds: Schema.Array(NewsMessageId),
      patch: NewsMessageStatePatch,
    }),
    success: Schema.Void,
    error: Schema.Union([
      SaveNotFoundError,
      NewsMessageNotFoundError,
      MalformedNewsMessageIdError,
    ]),
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
