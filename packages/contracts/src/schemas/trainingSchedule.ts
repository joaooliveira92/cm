import { Schema } from "effect";
import {
  TRAINING_INTENSITIES,
  TRAINING_SESSION_TYPES,
  TRAINING_TEMPLATE_NAMES,
} from "@cm-clone/shared";

import { FixtureId, SaveId, WriteRequestId } from "./ids.js";

/**
 * The team training schedule on the wire (training-schedule-and-delegation 03). The vocabulary —
 * session types, intensities, the fixed slot count, the named templates — lives in
 * `@cm-clone/shared`; these schemas only carry it across the process boundary.
 */
export const TrainingSessionTypeSchema = Schema.Literals(TRAINING_SESSION_TYPES);
export const TrainingIntensitySchema = Schema.Literals(TRAINING_INTENSITIES);
export const TrainingTemplateNameSchema = Schema.Literals(TRAINING_TEMPLATE_NAMES);

export const TrainingSessionSchema = Schema.Struct({
  type: TrainingSessionTypeSchema,
  intensity: TrainingIntensitySchema,
});

/** Who saved a schedule: the manager, or the Assistant Manager while delegation is on. */
export const TrainingScheduleAuthorSchema = Schema.Literals(["manager", "assistant"]);

/** The club's next unplayed Fixture — the end of the microcycle the schedule plans for. */
export class TrainingScheduleFixtureView extends Schema.Class<TrainingScheduleFixtureView>(
  "TrainingScheduleFixtureView",
)({
  fixtureId: FixtureId,
  date: Schema.String,
  opponentClubName: Schema.String,
  isHome: Schema.Boolean,
}) {}

/**
 * The Training Schedule screen's read: the saved sessions in slot order, the template they match
 * (derived on read; `null` is "Custom"), the revision a write must name, and the Fixture the
 * microcycle ends at — `null` once the club has no unplayed Fixture this Season.
 */
export class TrainingScheduleView extends Schema.Class<TrainingScheduleView>("TrainingScheduleView")({
  sessions: Schema.Array(TrainingSessionSchema),
  template: Schema.NullOr(TrainingTemplateNameSchema),
  revision: Schema.Natural,
  nextFixture: Schema.NullOr(TrainingScheduleFixtureView),
  /** True while the Assistant Manager plans the schedule (ticket 05). */
  delegated: Schema.Boolean,
  /** The club's Assistant Manager, by name — a derived Presence Staff person, never stored. */
  assistantName: Schema.String,
  /** Why the assistant chose the current sessions, when the assistant wrote them; else `null`. */
  assistantReason: Schema.NullOr(Schema.String),
}) {}

/**
 * The `changeTrainingSchedule` payload: the sessions to save, the revision the caller read, and a
 * fresh request id per submit. Same guard as `changeTactics`: a stale revision is a typed conflict,
 * and a replayed request id is a no-op returning the current state.
 */
export class ChangeTrainingSchedulePayload extends Schema.Class<ChangeTrainingSchedulePayload>(
  "ChangeTrainingSchedulePayload",
)({
  saveId: SaveId,
  sessions: Schema.Array(TrainingSessionSchema),
  expectedRevision: Schema.Natural,
  requestId: WriteRequestId,
}) {}

/** A schedule write named a revision the club has since moved past. Carries the current one so the
 *  editor can offer Refresh without a second read. */
export class TrainingScheduleRevisionConflictError extends Schema.TaggedError<TrainingScheduleRevisionConflictError>()(
  "TrainingScheduleRevisionConflictError",
  {
    saveId: SaveId,
    currentRevision: Schema.Natural,
  },
) {}

/**
 * The `setTrainingScheduleDelegation` payload: hand the schedule to the Assistant Manager
 * (`delegated: true`) or take it back. Revisioned and idempotent like a schedule write, because it
 * changes who may write the schedule.
 */
export class SetTrainingScheduleDelegationPayload extends Schema.Class<SetTrainingScheduleDelegationPayload>(
  "SetTrainingScheduleDelegationPayload",
)({
  saveId: SaveId,
  delegated: Schema.Boolean,
  expectedRevision: Schema.Natural,
  requestId: WriteRequestId,
}) {}

/** A schedule write the rules refuse — the wrong number of sessions. Unknown session types and
 *  intensities never get this far: the payload schema refuses them at decode. */
export class InvalidTrainingScheduleError extends Schema.TaggedError<InvalidTrainingScheduleError>()(
  "InvalidTrainingScheduleError",
  { reason: Schema.String },
) {}

/** The `TrainingScheduleSet` event every accepted schedule write appends to the club's stream,
 *  naming who saved it. */
export class TrainingScheduleSetEvent extends Schema.Class<TrainingScheduleSetEvent>("TrainingScheduleSetEvent")({
  seasonNumber: Schema.Finite,
  author: TrainingScheduleAuthorSchema,
  sessions: Schema.Array(TrainingSessionSchema),
  template: Schema.NullOr(TrainingTemplateNameSchema),
  /** On an assistant write: who, why, and the Fixture it planned for — what the News Message says. */
  assistantName: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
  opponentClubName: Schema.optional(Schema.NullOr(Schema.String)),
}) {}
