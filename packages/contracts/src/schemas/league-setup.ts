import { Schema } from "effect";
import {
  ADVANCED_OPTIONS_VERSION,
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
} from "@cm-clone/shared";

import { CompetitionId, NationId, RegionId, ScopeOptionId, SnapshotId } from "./ids.js";

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
