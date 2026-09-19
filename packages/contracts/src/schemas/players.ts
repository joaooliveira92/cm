import { Schema } from "effect";
import { ClubSummary } from "./clubs.js";
import { PlayerId, ClubId } from "./ids.js";
import { PlayerPositionView, AttributesSchema } from "./squad.js";

export class PlayerContractView extends Schema.Class<PlayerContractView>("PlayerContractView")({
  playerId: PlayerId,
  clubId: ClubId,
  wage: Schema.Finite,
  lengthYears: Schema.Finite,
  startDate: Schema.String,
  expiryDate: Schema.String,
}) {}

export class PlayerProfileView extends Schema.Class<PlayerProfileView>("PlayerProfileView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  nationality: Schema.String,
  birthplace: Schema.NullOr(Schema.String),
  positions: Schema.Array(PlayerPositionView),
  attributes: AttributesSchema,
  overallRating: Schema.Finite,
  transferValue: Schema.Finite,
  club: ClubSummary,
  contractExpiry: Schema.String,
  injuryStatus: Schema.String,
}) {}