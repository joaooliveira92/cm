import { Schema } from "effect";

import { ClubId, PlayerId } from "./ids.js";
import { AttributesSchema, NullableTrainingFocusSchema } from "./squad.js";

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
