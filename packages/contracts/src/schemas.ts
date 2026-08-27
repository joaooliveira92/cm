import { Schema } from "effect";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  STATURE_TIERS,
} from "@cm-clone/shared";

export class SaveSummary extends Schema.Class<SaveSummary>("SaveSummary")({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.String,
}) {}

export class SaveNotFoundError extends Schema.TaggedError<SaveNotFoundError>()(
  "SaveNotFoundError",
  {
    id: Schema.String,
  },
) {}

export const PositionSchema = Schema.Literals(POSITIONS);
export const FamiliarityTierSchema = Schema.Literals(FAMILIARITY_TIERS);
export const StatureTierSchema = Schema.Literals(STATURE_TIERS);

export class PlayerPositionView extends Schema.Class<PlayerPositionView>("PlayerPositionView")({
  position: PositionSchema,
  familiarity: FamiliarityTierSchema,
}) {}

/** Every outfield Attribute is required, 1-20; goalkeeping Attributes are undefined for outfield players. */
export const AttributesSchema = Schema.Struct({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, Schema.Number])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(Schema.Number)])),
});

export class SquadPlayerView extends Schema.Class<SquadPlayerView>("SquadPlayerView")({
  id: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  dateOfBirth: Schema.String,
  age: Schema.Number,
  attributes: AttributesSchema,
  positions: Schema.Array(PlayerPositionView),
  overallRating: Schema.Number,
  positionRatings: Schema.Record(Schema.String, Schema.Number),
}) {}

export class ClubSummary extends Schema.Class<ClubSummary>("ClubSummary")({
  id: Schema.String,
  name: Schema.String,
  statureTier: StatureTierSchema,
}) {}

export class SquadView extends Schema.Class<SquadView>("SquadView")({
  club: ClubSummary,
  players: Schema.Array(SquadPlayerView),
}) {}
