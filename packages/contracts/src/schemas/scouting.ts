import { Schema } from "effect";

import { ClubId, PlayerId } from "./ids.js";
import { KnowledgeConfidenceSchema } from "./team-scout-report.js";

/** One scout at the human's club, and the player or club they are watching if any. At most one of
 *  `playerId` and `targetClubId` is set: a scout holds one assignment, and a Club target is that
 *  club's squad rather than a second slot. */
export class ScoutingTargetView extends Schema.Class<ScoutingTargetView>("ScoutingTargetView")({
  scoutId: Schema.String,
  scoutName: Schema.String,
  /** 1-20. Sets how fast this scout accrues, and never how many players they can watch. */
  quality: Schema.Finite,
  playerId: Schema.NullOr(PlayerId),
  playerName: Schema.NullOr(Schema.String),
  targetClubId: Schema.NullOr(ClubId),
  targetClubName: Schema.NullOr(Schema.String),
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

/**
 * Scouting Knowledge (Screen 126): what the human's club has scouted, and nothing it has not.
 *
 * The shape carries coverage and never figures. No Attribute, Attribute Range, Overall Rating or
 * Transfer Value appears on either view, so this read cannot leak a hidden value however a screen
 * renders it: what a Player is like belongs to the Player's own Attribute Ranges, not to a list of
 * what has been observed.
 */

/** One Club with at least one scouted Player. `coverage` is `squadCoverage` over the Club's whole
 *  squad (Unscouted Players count as 0), so it rises both as more Players are scouted and as known
 *  ones are scouted further. */
export class KnowledgeClubView extends Schema.Class<KnowledgeClubView>("KnowledgeClubView")({
  clubId: ClubId,
  clubName: Schema.String,
  /** Players currently at the Club. */
  squadSize: Schema.Finite,
  /** Players at the Club with any Scouting Progress. The rest are Unscouted. */
  scoutedCount: Schema.Finite,
  /** Players at the Club who are Fully Scouted. */
  fullyScoutedCount: Schema.Finite,
  /** 0-1: total Scouting Progress over the whole squad. */
  coverage: Schema.Finite,
  knowledgeConfidence: KnowledgeConfidenceSchema,
}) {}

/** One scouted Player and how far the club's Scouting Progress on them has reached. `clubId` is
 *  `null` for a Free Agent. Never a Player on the human's own squad: those carry no progress. */
export class KnowledgePlayerView extends Schema.Class<KnowledgePlayerView>("KnowledgePlayerView")({
  playerId: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  clubId: Schema.NullOr(ClubId),
  clubName: Schema.NullOr(Schema.String),
  /** 1-100. Only scouted Players are listed, so an Unscouted zero never appears here. */
  progress: Schema.Finite,
}) {}

/** The Club view and the Player view of the same knowledge. Both empty for a save with no scouting. */
export class ScoutingKnowledgeView extends Schema.Class<ScoutingKnowledgeView>("ScoutingKnowledgeView")({
  clubs: Schema.Array(KnowledgeClubView),
  players: Schema.Array(KnowledgePlayerView),
}) {}
