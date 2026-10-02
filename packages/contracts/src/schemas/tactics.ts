import { Schema } from "effect";
import {
  COLUMNS,
  PLAYER_OVERRIDE_VALUES,
  PLAYER_STANDALONE_VALUES,
  PLAYER_SWITCHES,
  SET_PIECE_ROLE_VALUES,
  SWITCH_VALUES,
  TAKER_LISTS,
  TEAM_INSTRUCTION_VALUES,
  TEAM_SET_PIECE_VALUES,
  TEAM_SWITCHES,
  BUILT_IN_TEMPLATE_NAMES,
} from "@cm-clone/shared";

import { ClubSummary } from "./clubs.js";
import { PlayerId, SaveId, WriteRequestId } from "./ids.js";
import { FamiliarityTierSchema, SquadPlayerView } from "./squad.js";

/** One of the 29 built-in Tactic Templates, by name. The manager's preferred formation is one. */
export const TemplateNameSchema = Schema.Literals(BUILT_IN_TEMPLATE_NAMES);

/** The team Mentality value set (CM's five), for the surfaces that show or change only it. */
export const MentalitySchema = Schema.Literals(TEAM_INSTRUCTION_VALUES.mentality);
export type Mentality = typeof MentalitySchema.Type;

const literalFields = <const T extends Record<string, ReadonlyArray<string>>>(values: T) =>
  Object.fromEntries(Object.entries(values).map(([key, options]) => [key, Schema.Literals(options)])) as {
    readonly [K in keyof T]: Schema.Literals<T[K]>;
  };

const switchFields = <const K extends ReadonlyArray<string>, V extends Schema.Top>(names: K, schema: V) =>
  Object.fromEntries(names.map((name) => [name, schema])) as { readonly [N in K[number]]: V };

/** One cell of the grid: the goalkeeper's or the sweeper's single cell, or another row and a column. */
export const CellSchema = Schema.Union([
  Schema.Struct({ row: Schema.Literals(["GK", "SW"]), column: Schema.Literal("C") }),
  Schema.Struct({ row: Schema.Literals(["D", "DM", "M", "AM", "F"]), column: Schema.Literals(COLUMNS) }),
]);
export type Cell = typeof CellSchema.Type;

export const TeamInstructionsSchema = Schema.Struct({
  ...literalFields(TEAM_INSTRUCTION_VALUES),
  ...switchFields(TEAM_SWITCHES, Schema.Boolean),
});

export const PlayerInstructionsSchema = Schema.Struct({
  ...literalFields(PLAYER_OVERRIDE_VALUES),
  ...literalFields(PLAYER_STANDALONE_VALUES),
  ...switchFields(PLAYER_SWITCHES, Schema.Literals(SWITCH_VALUES)),
});

export const SetPieceRolesSchema = Schema.Struct(literalFields(SET_PIECE_ROLE_VALUES));
export const TeamSetPiecesSchema = Schema.Struct(literalFields(TEAM_SET_PIECE_VALUES));

/** The ordered taker lists and the captain, each best nominee first. */
export const TakersSchema = Schema.Struct(switchFields(TAKER_LISTS, Schema.Array(PlayerId)));

/** One slot of the Tactic: a grid cell, an optional run target, the slot's own instructions and
 *  set-piece roles, and the visual offset within the cell. `subRow`/`subCol` default to 0.5
 *  (centre) and are 0-1 fractions. Phase 1 is visual only. */
export class TacticSlot extends Schema.Class<TacticSlot>("TacticSlot")({
  cell: CellSchema,
  run: Schema.NullOr(CellSchema),
  instructions: PlayerInstructionsSchema,
  setPieceRoles: SetPieceRolesSchema,
  subRow: Schema.Finite,
  subCol: Schema.Finite,
}) {}

/**
 * The complete Tactic, the `ChangeTactics` command payload and what `getTactics` returns: eleven
 * slots (goalkeeper first) each with its cell, run and instructions, the nine Team Instructions and
 * team set-piece instructions, the players assigned to the slots in slot order, the fixed-size
 * match-day bench (a `null` entry is an unnamed substitute) and the ordered taker lists, all named by
 * the template it came from. A save replaces the whole of it. See the Agent Note
 * `.agents/notes/proposed/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md`.
 */
export class Tactic extends Schema.Class<Tactic>("Tactic")({
  sourceTemplate: Schema.String,
  slots: Schema.Array(TacticSlot),
  team: TeamInstructionsSchema,
  teamSetPieces: TeamSetPiecesSchema,
  assignments: Schema.Array(PlayerId),
  bench: Schema.Array(Schema.NullOr(PlayerId)),
  takers: TakersSchema,
}) {}

/** The rules' named problems with a Tactic, as `validateTactic` returns them. */
export const TacticProblemSchema = Schema.Union([
  Schema.TaggedStruct("WrongSlotCount", { count: Schema.Finite }),
  Schema.TaggedStruct("GoalkeeperNotFirst", {}),
  Schema.TaggedStruct("GoalkeeperOutsideSlotZero", { slot: Schema.Finite }),
  Schema.TaggedStruct("UnknownCell", { slot: Schema.Finite }),
  Schema.TaggedStruct("DuplicateCell", { slot: Schema.Finite, cell: Schema.String }),
  Schema.TaggedStruct("RunToGoalkeeper", { slot: Schema.Finite }),
  Schema.TaggedStruct("DistributionOffGoalkeeper", { slot: Schema.Finite }),
  Schema.TaggedStruct("InvalidValue", { where: Schema.String, field: Schema.String, value: Schema.Unknown }),
  Schema.TaggedStruct("BlankTemplateName", {}),
  Schema.TaggedStruct("WrongAssignmentCount", { count: Schema.Finite }),
  Schema.TaggedStruct("WrongBenchSize", { count: Schema.Finite }),
  Schema.TaggedStruct("PlayerTwice", { playerId: Schema.String }),
  Schema.TaggedStruct("PlayerNotInSquad", { playerId: Schema.String }),
  Schema.TaggedStruct("DuplicateTaker", { list: Schema.String, playerId: Schema.String }),
  Schema.TaggedStruct("UnknownTakerList", { list: Schema.String }),
  Schema.TaggedStruct("SubPositionOutOfRange", { slot: Schema.Finite, field: Schema.String, value: Schema.Finite }),
]);

/** A Tactic the rules refuse. `problems` are the rules' named problems, every one found; `reason`
 *  is them in one sentence for a surface with no room to mark each. */
export class InvalidTacticError extends Schema.TaggedError<InvalidTacticError>()(
  "InvalidTacticError",
  {
    reason: Schema.String,
    problems: Schema.Array(TacticProblemSchema),
  },
) {}

/**
 * Raised when a `changeTactics` submit's `expectedRevision` no longer matches the stored revision,
 * so the caller offered a stale write. Names the revision that won the race so a caller can offer
 * Refresh rather than guessing. A replay carrying an already-seen `requestId` never raises this —
 * it is a no-op success. See the revision-and-idempotency note.
 */
export class TacticRevisionConflictError extends Schema.TaggedError<TacticRevisionConflictError>()(
  "TacticRevisionConflictError",
  {
    saveId: SaveId,
    currentRevision: Schema.Natural,
  },
) {}

/**
 * The `changeTactics` command payload: the complete Tactic to write in place of the stored one, the
 * `expectedRevision` the caller read, and a fresh `requestId` per submit. A submit whose revision is
 * stale fails with a typed conflict; a replay of an already-accepted `requestId` is a no-op that
 * returns the current state.
 */
export class ChangeTacticsPayload extends Schema.Class<ChangeTacticsPayload>(
  "ChangeTacticsPayload",
)({
  saveId: SaveId,
  tactic: Tactic,
  expectedRevision: Schema.Natural,
  requestId: WriteRequestId,
}) {}

export class TacticsScreenView extends Schema.Class<TacticsScreenView>("TacticsScreenView")({
  club: ClubSummary,
  squad: Schema.Array(SquadPlayerView),
  tactic: Schema.NullOr(Tactic),
  /** The club tactic's monotonically increasing revision, from 0 (never saved) upward. Both
   *  `getTactics` and an accepted `changeTactics` echo the revision their value was read at, so a
   *  caller that later learns a larger revision knows its read is stale. */
  revision: Schema.Natural,
}) {}

// ---------------------------------------------------------------------------
// Tactic Library (ticket 25)
// ---------------------------------------------------------------------------

/**
 * One Tactic Template's summary in the library view: enough for the sidebar list the
 * renderer holds and for identifying which template a mutation targets.
 */
export class TacticTemplateSummary extends Schema.Class<TacticTemplateSummary>("TacticTemplateSummary")({
  id: Schema.Natural,
  name: Schema.String,
  sourceTemplate: Schema.String,
  isBuiltIn: Schema.Boolean,
  revision: Schema.Natural,
  rowCountLabel: Schema.String,
}) {}

/** Save a new Tactic Template from the current live Tactic. */
export class SaveTacticTemplatePayload extends Schema.Class<SaveTacticTemplatePayload>(
  "SaveTacticTemplatePayload",
)({
  saveId: SaveId,
  name: Schema.String,
  tactic: Tactic,
  requestId: WriteRequestId,
}) {}

/** Rename a saved Tactic Template. */
export class RenameTacticTemplatePayload extends Schema.Class<RenameTacticTemplatePayload>(
  "RenameTacticTemplatePayload",
)({
  saveId: SaveId,
  id: Schema.Natural,
  name: Schema.String,
  expectedRevision: Schema.Natural,
  requestId: WriteRequestId,
}) {}

/** Overwrite a saved Tactic Template's content from the current live Tactic. */
export class OverwriteTacticTemplatePayload extends Schema.Class<OverwriteTacticTemplatePayload>(
  "OverwriteTacticTemplatePayload",
)({
  saveId: SaveId,
  id: Schema.Natural,
  tactic: Tactic,
  expectedRevision: Schema.Natural,
  requestId: WriteRequestId,
}) {}

/** Duplicate a saved Tactic Template. */
export class DuplicateTacticTemplatePayload extends Schema.Class<DuplicateTacticTemplatePayload>(
  "DuplicateTacticTemplatePayload",
)({
  saveId: SaveId,
  id: Schema.Natural,
  requestId: WriteRequestId,
}) {}

/** Delete a saved Tactic Template. */
export class DeleteTacticTemplatePayload extends Schema.Class<DeleteTacticTemplatePayload>(
  "DeleteTacticTemplatePayload",
)({
  saveId: SaveId,
  id: Schema.Natural,
  expectedRevision: Schema.Natural,
  requestId: WriteRequestId,
}) {}

/** Quick-load a saved Tactic Template onto the current Tactic, keeping players by slot number. */
export class QuickLoadTacticPayload extends Schema.Class<QuickLoadTacticPayload>(
  "QuickLoadTacticPayload",
)({
  saveId: SaveId,
  id: Schema.Natural,
  requestId: WriteRequestId,
}) {}

/** The tactic library view: all saved templates and built-in template names. */
export class TacticLibraryView extends Schema.Class<TacticLibraryView>("TacticLibraryView")({
  templates: Schema.Array(TacticTemplateSummary),
  builtInTemplateNames: Schema.Array(Schema.String),
}) {}

/** A template name that is already taken (case-insensitive uniqueness violated). */
export class TacticLibraryNameTakenError extends Schema.TaggedError<TacticLibraryNameTakenError>()(
  "TacticLibraryNameTakenError",
  {
    saveId: SaveId,
    name: Schema.String,
  },
) {}

/** No template found for the given id. */
export class TacticLibraryNotFoundError extends Schema.TaggedError<TacticLibraryNotFoundError>()(
  "TacticLibraryNotFoundError",
  {
    saveId: SaveId,
    id: Schema.Natural,
  },
) {}

/** The expected revision does not match the stored revision — a stale write or delete. */
export class TacticLibraryRevisionConflictError extends Schema.TaggedError<TacticLibraryRevisionConflictError>()(
  "TacticLibraryRevisionConflictError",
  {
    saveId: SaveId,
    id: Schema.Natural,
    currentRevision: Schema.Natural,
  },
) {}

/** The template is read-only (built-in) and cannot be renamed, overwritten, or deleted. */
export class TacticLibraryReadOnlyError extends Schema.TaggedError<TacticLibraryReadOnlyError>()(
  "TacticLibraryReadOnlyError",
  {
    saveId: SaveId,
    id: Schema.Natural,
    name: Schema.String,
  },
) {}

// ---------------------------------------------------------------------------
// Tactics Overview snapshot (Screen 80 / ticket 02)
// ---------------------------------------------------------------------------

/** One slot of the formation preview — the cell the Tactic's shape fills, where it runs to, and
 *  the visual offset within the cell. */
export class FormationSlotView extends Schema.Class<FormationSlotView>("FormationSlotView")({
  cell: CellSchema,
  run: Schema.NullOr(CellSchema),
  subRow: Schema.Finite,
  subCol: Schema.Finite,
}) {}

/** The formation summary: the template the Tactic came from, whether it has moved off it, the
 *  row-count shape it makes now, and its eleven preview slots, so the overview can draw a pitch
 *  without importing the template table itself. `modified` and `shape` are derived on the read. */
export class FormationSummaryView extends Schema.Class<FormationSummaryView>("FormationSummaryView")({
  template: Schema.String,
  modified: Schema.Boolean,
  /** The row-count label of the slots as they stand (`4-4-2`, `3-2-3-2`). */
  shape: Schema.String,
  /** The Tactic's slots, the GK first, in slot order. */
  slots: Schema.Array(FormationSlotView),
}) {}

/**
 * One starter's assignment to a Tactic slot, with the numbers that justify it already computed at
 * the trusted boundary — the renderer displays numbers and derives nothing tactical itself.
 *
 * `firstName`/`lastName`/`positionRating` are null for a slot whose named player has since left the
 * squad: the readiness issues name that blocker and the overview shows the gap.
 */
export class PlayerAssignmentView extends Schema.Class<PlayerAssignmentView>("PlayerAssignmentView")({
  playerId: PlayerId,
  firstName: Schema.NullOr(Schema.String),
  lastName: Schema.NullOr(Schema.String),
  cell: CellSchema,
  /** The assigned player's 1-100 Position Rating in `cell`, computed on this read. */
  positionRating: Schema.NullOr(Schema.Finite),
  /** How well the assigned player suits the slot: his Familiarity Tier, derived from Suitability on
   *  this read. */
  familiarity: Schema.NullOr(FamiliarityTierSchema),
}) {}

/**
 * The derived familiarity summary: how many of the starters are Natural, Competent, or Unfamiliar
 * in the cell their slot assigns. Derived, never assigned — folded from each starter's Suitability
 * and the selection the Tactic makes of them. Formation- and
 * instruction-level familiarity are deferred to the Training domain, so v1 carries these counts only.
 */
export class FamiliaritySummaryView extends Schema.Class<FamiliaritySummaryView>(
  "FamiliaritySummaryView",
)({
  natural: Schema.Finite,
  competent: Schema.Finite,
  unfamiliar: Schema.Finite,
}) {}

/** A named player on the selection lists — identity for routing plus the name the overview shows. */
export class SelectedPlayerView extends Schema.Class<SelectedPlayerView>("SelectedPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
}) {}

/**
 * The selection summary. Starters are exactly the registered players the active Tactic's slots
 * name, in slot order; substitutes are the registered players named on the active Tactic's bench.
 * The two never overlap, and together they are the match-day eighteen — a subset of the squad, so
 * squad members outside the eighteen are part of no selection.
 */
export class SelectionSummaryView extends Schema.Class<SelectionSummaryView>("SelectionSummaryView")({
  starters: Schema.Array(SelectedPlayerView),
  substitutes: Schema.Array(SelectedPlayerView),
}) {}

/**
 * Set-piece status. "none" until the Set Priorities screen reads the Tactic's set-piece settings:
 * the Tactic stores them now, but the overview shows one status rather than an empty list that
 * would imply configuration could be seen here. The snapshot neither invents set pieces nor
 * reveals hidden opposition or scouting data.
 */
export class SetPieceStatusView extends Schema.Class<SetPieceStatusView>("SetPieceStatusView")({
  status: Schema.Literal("none"),
}) {}

/**
 * One blocker or advisory readiness finding on the snapshot, with the severity the rule assigned
 * and the screen that owns fixing it. Blockers and advisories are reported together so resolving
 * one never unmasks a second surprise.
 */
export class ReadinessIssueView extends Schema.Class<ReadinessIssueView>("ReadinessIssueView")({
  id: Schema.String,
  severity: Schema.Literals(["blocking", "advisory"]),
  title: Schema.String,
  detail: Schema.String,
  /** The screen that owns the fix, or `null` when the condition clears itself. */
  destination: Schema.NullOr(Schema.String),
}) {}

/**
 * The Tactics Overview's one read: an immutable snapshot of the active club's tactical preparation.
 *
 * Every value in it is bound to one club-and-tactic revision pair (the club tactic `revision` below,
 * the same value ticket 01's accepted save echoes), so a requester that later learns a newer
 * revision exists discards the snapshot whole rather than rendering a mix of old and new.
 */
export class TacticsOverviewView extends Schema.Class<TacticsOverviewView>("TacticsOverviewView")({
  club: ClubSummary,
  /** The club tactic revision this snapshot was read at — every section binds to this one revision. */
  revision: Schema.Natural,
  /** The active template, its shape and its preview slots, or `null` while no Tactic is saved. */
  formation: Schema.NullOr(FormationSummaryView),
  /** The nine Team Instruction values, or `null` while no Tactic is saved. */
  instructions: Schema.NullOr(TeamInstructionsSchema),
  /** One assignment per Tactic slot; empty while no Tactic is saved. */
  assignments: Schema.Array(PlayerAssignmentView),
  /** The derived familiarity counts over the starters, or `null` while no Tactic is saved. */
  familiarity: Schema.NullOr(FamiliaritySummaryView),
  /** Starters and named bench, the match-day eighteen; nobody outside it. */
  selection: SelectionSummaryView,
  /** No set pieces configured until Screen 86 lands. */
  setPieces: SetPieceStatusView,
  /** Every blocking and advisory readiness finding, with the screen that owns fixing it. */
  issues: Schema.Array(ReadinessIssueView),
}) {}
