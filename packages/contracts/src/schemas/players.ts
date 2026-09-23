import {
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
} from "@cm-clone/shared";
import { Schema } from "effect";
import { ClubSummary } from "./clubs.js";
import { PlayerId, ClubId } from "./ids.js";
import { PlayerPositionView } from "./squad.js";
import { PlayerFigureSchema } from "./transfers.js";

export class PlayerContractView extends Schema.Class<PlayerContractView>("PlayerContractView")({
  playerId: PlayerId,
  clubId: ClubId,
  wage: Schema.Finite,
  lengthYears: Schema.Finite,
  startDate: Schema.String,
  expiryDate: Schema.String,
}) {}

/**
 * The profile's per-Attribute figures: an exact value or an Attribute Range, by the reader's
 * Scouting Progress on the player. Exact when the player is on the manager's own squad or Fully
 * Scouted; ranged below it, for every Attribute. Same optionality as `AttributesSchema` — an
 * outfield player carries no Goalkeeping figure at all, and hidden Attributes ride along so the
 * match engine can read them.
 */
export const AttributeFiguresSchema = Schema.Struct({
  ...Object.fromEntries(
    OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, PlayerFigureSchema]),
  ),
  ...Object.fromEntries(
    GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(PlayerFigureSchema)]),
  ),
  ...Object.fromEntries(
    HIDDEN_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(PlayerFigureSchema)]),
  ),
});

/**
 * The Player Profile read (Screen 50) — what the manager's club knows about a player.
 *
 * `attributes`, `overallRating` and `transferValue` are the own-club or Fully Scouted exact
 * figures for the manager's club and scouted rivals, and Attribute Ranges below Fully Scouted
 * (Agent Note 2026-09-19 — knowledge limits every player read; ticket 10 extends the market
 * rule to the player screens).
 */
export class PlayerProfileView extends Schema.Class<PlayerProfileView>("PlayerProfileView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  nationality: Schema.String,
  birthplace: Schema.NullOr(Schema.String),
  positions: Schema.Array(PlayerPositionView),
  attributes: AttributeFiguresSchema,
  overallRating: PlayerFigureSchema,
  transferValue: PlayerFigureSchema,
  club: ClubSummary,
  contractExpiry: Schema.String,
  injuryStatus: Schema.String,
}) {}