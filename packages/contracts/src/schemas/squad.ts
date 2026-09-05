import { Schema } from "effect";
import {
  CATEGORIES,
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
} from "@cm-clone/shared";

import { ClubSummary } from "./clubs.js";
import { PlayerId } from "./ids.js";

export const PositionSchema = Schema.Literals(POSITIONS);
export const FamiliarityTierSchema = Schema.Literals(FAMILIARITY_TIERS);


/** The four Attribute Categories a Training Focus may name (Player Development / Training Focus). */
export const TrainingFocusSchema = Schema.Literals(CATEGORIES);

/** A player's Training Focus: a Category, or `null` meaning the no-focus default. */
export const NullableTrainingFocusSchema = Schema.NullOr(TrainingFocusSchema);

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
  overallRating: Schema.Finite,
  positionRatings: Schema.Record(Schema.String, Schema.Finite),
  /** The player's current Condition (%) from the Season's fitness ledger (ticket 10) — below 100
   * means they carry a shortfall from a recent heavy fixture/injury that hasn't fully recovered. */
  condition: Schema.Finite,
  /** The player's Training Focus Category, or `null` for the no-focus default (Training Focus).
   * A missing persisted value reads as `null` — no migration/backfill. */
  trainingFocus: NullableTrainingFocusSchema,
  /** The player's single nationality, as a real country name — factual geography, so it is carried
   *  directly rather than resolved through the content pack. */
  nationality: Schema.String,
  /** The city the player was born in, or `null` for a player born outside the loaded world. Real
   *  geography, carried directly for the same reason. */
  birthplace: Schema.NullOr(Schema.String),
}) {}

export class SquadView extends Schema.Class<SquadView>("SquadView")({
  club: ClubSummary,
  players: Schema.Array(SquadPlayerView),
}) {}
