import { Schema } from "effect";
import { ALL_ATTRIBUTES } from "@cm-clone/shared";

import { ClubId, PlayerId } from "./ids.js";
import { AttributesSchema, NullableTrainingFocusSchema, TrainingFocusSchema } from "./squad.js";
import { StaffDepartmentSchema } from "./clubs.js";

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

/** Raised when `SetTrainingFocus` or `getPlayerDevelopmentHistory` targets a player who isn't on the
 * user's own club — Training Focus and development history cover the manager's own squad only. */
export class NotYourPlayerError extends Schema.TaggedError<NotYourPlayerError>()("NotYourPlayerError", {
  playerId: PlayerId,
}) {}

/** Raised when `SetTrainingFocus` names a Category the player may not take: one whose Attributes the
 * player does not have, such as Goalkeeping for an outfield player. */
export class TrainingFocusNotOfferedError extends Schema.TaggedError<TrainingFocusNotOfferedError>()(
  "TrainingFocusNotOfferedError",
  {
    playerId: PlayerId,
    focus: TrainingFocusSchema,
  },
) {}

/**
 * One coach on the Coaching Assignments screen (Screen 111): id, name, quality rating (1-20), and
 * the department/specialty they serve. Uses existing coach data from the `staff` DB table, where
 * `name` is stored as a single `"firstName lastName"` string matching the generated fiction, and
 * `quality` is the 1-20 rating from the same row. The department is derived from the role via
 * `StaffDepartmentSchema` (always "coaching" for a coach).
 */
export class CoachAssignmentView extends Schema.Class<CoachAssignmentView>("CoachAssignmentView")({
  id: Schema.String,
  name: Schema.String,
  quality: Schema.Finite,
  department: StaffDepartmentSchema,
}) {}

/** The Coaching Assignments screen's whole view: a (possibly empty) list of coaches on the
 * manager's own club. No club summary is needed because the screen lives under the save-scoped
 * Training area and the club is always the user's own. */
export class CoachingAssignmentsView extends Schema.Class<CoachingAssignmentsView>("CoachingAssignmentsView")({
  coaches: Schema.Array(CoachAssignmentView),
}) {}

/** The most recent injury's Severity on a player's fitness ledger row, or `"none"` when the player
 * has not been injured this Season. The same four values the `player_fitness` table admits. */
export const LastInjurySeveritySchema = Schema.Literals(["none", "light", "medium", "severe"]);

/** A player's Rest/Active recovery indicator: `rest` when Condition is below the engine's
 * non-contact injury threshold, `active` otherwise. */
export const RecoveryIndicatorSchema = Schema.Literals(["rest", "active"]);

/**
 * One player on the Workload and Recovery screen (Screen 112): identity, the two fitness-ledger
 * fields recovery is keyed to — the current Condition (%) and the last injury's Severity — and the
 * Rest/Active indicator main derives from Condition at read time. Nothing here is persisted.
 */
export class WorkloadPlayerView extends Schema.Class<WorkloadPlayerView>("WorkloadPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  condition: Schema.Finite,
  lastInjurySeverity: LastInjurySeveritySchema,
  recovery: RecoveryIndicatorSchema,
}) {}

/** The Workload and Recovery screen's whole view: every player on the manager's own club, in a
 * stable name order. An empty list is valid for a club with no players. */
export class WorkloadView extends Schema.Class<WorkloadView>("WorkloadView")({
  players: Schema.Array(WorkloadPlayerView),
}) {}

/** A visible Attribute's name. Hidden Attributes (Injury Proneness) are not in this list, so no
 *  development read can carry one to the renderer. */
export const VisibleAttributeSchema = Schema.Literals(ALL_ATTRIBUTES);

/** One visible Attribute that moved between two recorded `PlayerDeveloped` outcomes. */
export class AttributeChangeView extends Schema.Class<AttributeChangeView>("AttributeChangeView")({
  attribute: VisibleAttributeSchema,
  from: Schema.Finite,
  to: Schema.Finite,
}) {}

/**
 * One concluded Season of a player's recorded Player Development. `changes` compares that Season's
 * `PlayerDeveloped` outcome with the player's previous recorded outcome, in `comparedWithSeason`.
 * The log records outcomes only, never the Attributes a player started from, so the earliest
 * recorded Season has nothing to compare with: `comparedWithSeason` is `null` and `changes` empty.
 */
export class SeasonDevelopmentView extends Schema.Class<SeasonDevelopmentView>("SeasonDevelopmentView")({
  seasonNumber: Schema.Finite,
  comparedWithSeason: Schema.NullOr(Schema.Finite),
  changes: Schema.Array(AttributeChangeView),
}) {}

/** Performance Report (Screen 113): one own-club player's recorded Player Development, newest
 *  Season first. Empty until a Season has concluded with the player on the manager's club. */
export class PlayerDevelopmentHistoryView extends Schema.Class<PlayerDevelopmentHistoryView>(
  "PlayerDevelopmentHistoryView",
)({
  playerId: PlayerId,
  seasons: Schema.Array(SeasonDevelopmentView),
}) {}

/**
 * One player on the Player Development Centre (Screen 114): identity, standing Training Focus, and
 * the newest Season of their recorded Player Development. `latestSeason` is exactly the first entry
 * `getPlayerDevelopmentHistory` would return for the player, or `null` when no Season has concluded
 * with them at the manager's club. Visible Attributes only; nothing here is a rating or persisted.
 */
export class SquadDevelopmentPlayerView extends Schema.Class<SquadDevelopmentPlayerView>(
  "SquadDevelopmentPlayerView",
)({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  trainingFocus: NullableTrainingFocusSchema,
  latestSeason: Schema.NullOr(SeasonDevelopmentView),
}) {}

/** The Player Development Centre's whole view: every player on the manager's own club, in a stable
 *  name order. An empty list is valid for a club with no players. */
export class SquadDevelopmentView extends Schema.Class<SquadDevelopmentView>("SquadDevelopmentView")({
  players: Schema.Array(SquadDevelopmentPlayerView),
}) {}
