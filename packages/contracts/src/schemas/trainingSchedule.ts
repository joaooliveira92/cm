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

/** Who saved a schedule. The Assistant Manager joins this when delegation ships (ticket 05). */
export const TrainingScheduleAuthorSchema = Schema.Literals(["manager"]);

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
}) {}
