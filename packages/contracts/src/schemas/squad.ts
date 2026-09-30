import { Schema } from "effect";
import {
  CATEGORIES,
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  POSITION_FILTERS,
  RETRAINING_TARGETS,
} from "@cm-clone/shared";

import { ClubSummary } from "./clubs.js";
import { PlayerId } from "./ids.js";

export const PositionSchema = Schema.Literals(POSITIONS);
export const FamiliarityTierSchema = Schema.Literals(FAMILIARITY_TIERS);

/** A position filter: a row, and for outfield rows but the sweeper a side (`D R`, `GK`). */
export const PositionFilterSchema = Schema.Literals(POSITION_FILTERS);

/** What a player view carries about positions in place of the ratings no screen shows: CM's compact
 *  label, the filters he can play (Suitability 15 or more), and his pitch-order sort key. */
export const PositionSummaryFields = {
  positionLabel: Schema.String,
  canPlay: Schema.Array(PositionFilterSchema),
  positionOrder: Schema.Finite,
};


/** The four Attribute Categories a Training Focus may name (Player Development / Training Focus). */
export const TrainingFocusSchema = Schema.Literals(CATEGORIES);

/** A player's Training Focus: a Category, or `null` meaning the no-focus default. */
export const NullableTrainingFocusSchema = Schema.NullOr(TrainingFocusSchema);

/** What a player can be retrained toward: one positional line (GK, SW, D, DM, M, AM, F, WB) or one
 *  side (R, L, C). */
export const RetrainingTargetSchema = Schema.Literals(RETRAINING_TARGETS);

/** A player's retraining target, or `null` when none is set. */
export const NullableRetrainingTargetSchema = Schema.NullOr(RetrainingTargetSchema);

export class PlayerPositionView extends Schema.Class<PlayerPositionView>("PlayerPositionView")({
  position: PositionSchema,
  familiarity: FamiliarityTierSchema,
}) {}

/**
 * Every outfield Attribute is required, 1-20; goalkeeping Attributes are undefined for outfield
 * players. Hidden attributes ride along optionally so the match engine receives them when it builds
 * a team setup — no UI group renders them, so they stay hidden at the display layer.
 */
export const AttributesSchema = Schema.Struct({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, Schema.Finite])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(Schema.Finite)])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(Schema.Finite)])),
});

export class SquadPlayerView extends Schema.Class<SquadPlayerView>("SquadPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  dateOfBirth: Schema.String,
  age: Schema.Finite,
  attributes: AttributesSchema,
  positions: Schema.Array(PlayerPositionView),
  ...PositionSummaryFields,
  overallRating: Schema.Finite,
  /** The player's 1-100 fit rating at each Position: Position Rating scaled by Suitability, the map
   *  Squad Quality and the AI's squad-gap check read. Transitional, like the ten-Position list. */
  positionRatings: Schema.Record(Schema.String, Schema.Finite),
  /** The player's 1-100 fit rating at each of the grid's 31 cells, keyed by the cell's label
   *  (`GK`, `D RC`): Position Rating in the cell scaled by Suitability. What the assistant's pick and
   *  the AI's best XI read. */
  cellRatings: Schema.Record(Schema.String, Schema.Finite),
  /** The player's 1-20 Suitability for each of the grid's 31 cells, keyed by the cell's label,
   *  derived on read from his positional ratings (never the ratings themselves, which no screen
   *  shows). What the Tactics screen's fit indicator and the lineup bar read. */
  suitability: Schema.Record(Schema.String, Schema.Finite),
  /** The player's current Condition (%) from the Season's fitness ledger (ticket 10) — below 100
   * means they carry a shortfall from a recent heavy fixture/injury that hasn't fully recovered. */
  condition: Schema.Finite,
  /** The player's Training Focus Category, or `null` for the no-focus default (Training Focus).
   * A missing persisted value reads as `null` — no migration/backfill. */
  trainingFocus: NullableTrainingFocusSchema,
  /** The line or side the manager is retraining this player toward, or `null`. Only the manager's
   *  own players can have one. */
  retrainingTarget: NullableRetrainingTargetSchema,
  /** The player's single nationality, as a real country name — factual geography, so it is carried
   *  directly rather than resolved through the content pack. */
  nationality: Schema.String,
  /** The city the player was born in, or `null` for a player born outside the loaded world. Real
   *  geography, carried directly for the same reason. */
  birthplace: Schema.NullOr(Schema.String),
  /** Whether the player's nationality differs from his club's nation (the nation of the club's home
   *  city). Computed on the read, against nation ids, because the view's `nationality` is a display
   *  name and the club's nation is not on the wire. */
  foreign: Schema.Boolean,
  /** The Contract's wage in Credits, or `null` for a player with no active Contract — the window
   *  inside the expiry sweep where the row is gone and the player not yet moved (`db/schema.ts`).
   *  `null`, never `0`: a free player is not one paid nothing. */
  contractWage: Schema.NullOr(Schema.Finite),
  /** The last day the Contract runs (ISO `YYYY-MM-DD`): `seasonEndDate` of its last Season. The
   *  player is freed at that Season's `SeasonConcluded`, which cannot fall later, and the calendar
   *  jumps from there to the next Season's start. `null` exactly when `contractWage` is. */
  contractExpiryDate: Schema.NullOr(Schema.String),
  /** The player's Transfer Value in Credits, exact — this read serves a club's own squad. */
  transferValue: Schema.Finite,
}) {}

export class SquadView extends Schema.Class<SquadView>("SquadView")({
  club: ClubSummary,
  players: Schema.Array(SquadPlayerView),
}) {}
