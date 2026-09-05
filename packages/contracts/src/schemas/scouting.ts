import { Schema } from "effect";

import { PlayerId } from "./ids.js";

/** One scout at the human's club, and the player they are watching if any. */
export class ScoutingTargetView extends Schema.Class<ScoutingTargetView>("ScoutingTargetView")({
  scoutId: Schema.String,
  scoutName: Schema.String,
  /** 1-20. Sets how fast this scout accrues, and never how many players they can watch. */
  quality: Schema.Finite,
  playerId: Schema.NullOr(PlayerId),
  playerName: Schema.NullOr(Schema.String),
  /** 0-100, or `null` for Unscouted — the absence of a progress row, not a stored zero. */
  progress: Schema.NullOr(Schema.Finite),
}) {}

/** The scouting board: the club's scouts are its assignment slots, so this is the whole resource. */
export class ScoutingView extends Schema.Class<ScoutingView>("ScoutingView")({
  scouts: Schema.Array(ScoutingTargetView),
}) {}

/** Raised when `AssignScout`/`UnassignScout` names a scout the save does not have. There is no
 *  companion "at cap" or "already assigned" error: the schema makes both unreachable. */
export class UnknownScoutError extends Schema.TaggedError<UnknownScoutError>()(
  "UnknownScoutError",
  {
    scoutId: Schema.String,
  },
) {}
