import { Schema } from "effect";
import {
  FORMATIONS,
  MENTALITY_OPTIONS,
  PRESSING_OPTIONS,
  ROLES,
  TEMPO_OPTIONS,
} from "@cm-clone/shared";

import { ClubSummary } from "./clubs.js";
import { PlayerId, SaveId, WriteRequestId } from "./ids.js";
import { PositionSchema, SquadPlayerView } from "./squad.js";

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
 *  player per slot, the 3 Team Instructions, and the fixed-size match-day bench. A bench entry is
 *  `null` while that substitute slot is unnamed — a club may field fewer than the rule allows. */
export class Tactic extends Schema.Class<Tactic>("Tactic")({
  formation: FormationSchema,
  slots: Schema.Array(TacticSlot),
  bench: Schema.Array(Schema.NullOr(PlayerId)),
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
 * The `changeTactics` command payload: the Tactic to write, the `expectedRevision` the caller
 * read, and a fresh `requestId` per submit. A submit whose revision is stale fails with a typed
 * conflict; a replay of an already-accepted `requestId` is a no-op that returns the current state.
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
// Tactics Overview snapshot (Screen 80 / ticket 02)
// ---------------------------------------------------------------------------

/** One slot of the formation preview — the Position the formation fills, in fixed slot order. */
export class FormationSlotView extends Schema.Class<FormationSlotView>("FormationSlotView")({
  position: PositionSchema,
}) {}

/** The formation summary: the active Formation's name and its eleven preview slots, so the overview
 *  can draw a pitch without importing `FORMATION_SLOTS` itself. */
export class FormationSummaryView extends Schema.Class<FormationSummaryView>("FormationSummaryView")({
  formation: FormationSchema,
  /** The formation's slots, the implicit GK first, in the fixed order the formation defines. */
  slots: Schema.Array(FormationSlotView),
}) {}

/** The three Team Instructions as the active Tactic carries them. */
export class TeamInstructionSummaryView extends Schema.Class<TeamInstructionSummaryView>(
  "TeamInstructionSummaryView",
)({
  mentality: MentalitySchema,
  tempo: TempoSchema,
  pressing: PressingSchema,
}) {}

/**
 * One starter's assignment to a Tactic slot, with the ratings that justify it already computed at
 * the trusted boundary — the renderer displays numbers and derives nothing tactical itself.
 *
 * `firstName`/`lastName`/`positionRating`/`roleRating` are null for a slot whose named player has
 * since left the squad: the readiness issues name that blocker and the overview shows the gap.
 */
export class PlayerAssignmentView extends Schema.Class<PlayerAssignmentView>("PlayerAssignmentView")({
  playerId: PlayerId,
  firstName: Schema.NullOr(Schema.String),
  lastName: Schema.NullOr(Schema.String),
  position: PositionSchema,
  role: RoleSchema,
  /** The assigned player's 1-100 Position Rating at `position`, computed on this read. */
  positionRating: Schema.NullOr(Schema.Finite),
  /** The assigned player's 1-100 Role Rating at `role`, computed on this read. */
  roleRating: Schema.NullOr(Schema.Finite),
}) {}

/**
 * The derived familiarity summary: how many of the starters are Natural, Competent, or Unfamiliar
 * in the Position their slot assigns. Derived, never assigned — folded from each starter's existing
 * position-familiarity tier and the selection the Tactic makes of them. Formation- and
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
 * Set-piece status. "none" until Screen 86 (Set Pieces) lands: v1's Tactic carries no set-piece
 * plans, so the summary is one status rather than an empty list that would imply configuration
 * could exist. The snapshot neither invents set pieces nor reveals hidden opposition or scouting data.
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
  /** The active formation and its preview slots, or `null` while no Tactic is saved. */
  formation: Schema.NullOr(FormationSummaryView),
  /** The three Team Instruction values, or `null` while no Tactic is saved. */
  instructions: Schema.NullOr(TeamInstructionSummaryView),
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
