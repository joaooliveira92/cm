import { Schema } from "effect";

import { ClubId, PlayerId } from "./ids.js";
import { PlayerPositionView, PositionSchema } from "./squad.js";
import { PlayerFigureSchema } from "./transfers.js";

/**
 * The Player Search (Screen 119) query — every filter the manager can set before submitting.
 *
 * Every field is optional, and the renderer sends only the fields it holds (its canonical
 * serializer omits empty ones), so a query that filters on nothing is `{}` and means "every
 * player, the whole save". `minAge`/`maxAge` are inclusive; `position` matches any of a player's
 * positions; `nationality` is a canonical nation id (as every wire name of a nation is) and
 * `clubName` is free text matched against the resolved club names (so "Free Agent" is not a
 * club — a Free Agent has no club and matches club-agnostic searches by not matching at all).
 */
export const PlayerSearchQuerySchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  minAge: Schema.optional(Schema.Finite),
  maxAge: Schema.optional(Schema.Finite),
  position: Schema.optional(PositionSchema),
  nationality: Schema.optional(Schema.String),
  clubName: Schema.optional(Schema.String),
});
export type PlayerSearchQuery = Schema.Schema.Type<typeof PlayerSearchQuerySchema>;

/**
 * One Player Search result row — a player anywhere in the save, read by the human club's Scouting
 * Progress on him, exactly as the market and profile reads do (Agent Note 2026-09-19, tickets
 * 09/10): the manager's own Players exact, a rival or Free Agent an Attribute Range until Fully
 * Scouted. `nationality` is the canonical nation id with the same convention as
 * `PlayerProfileView.nationality` — the renderer renders it through `nationName`.
 */
export class PlayerSearchResultView extends Schema.Class<PlayerSearchResultView>("PlayerSearchResultView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  clubId: Schema.NullOr(ClubId),
  clubName: Schema.NullOr(Schema.String),
  nationality: Schema.String,
  positions: Schema.Array(PlayerPositionView),
  overallRating: PlayerFigureSchema,
  transferValue: PlayerFigureSchema,
}) {}

/**
 * The Player Search results — a deterministic, neutral-ordered slice of the whole save. `total` is
 * the count the filters matched before the `PLAYER_SEARCH_MAX_RESULTS` cap, so the screen can show
 * "first N of M" when a broad search did not fit on the page; both are exact counts of what the
 * save holds, carrying no figure about any one player.
 */
export class PlayerSearchResultsView extends Schema.Class<PlayerSearchResultsView>("PlayerSearchResultsView")({
  total: Schema.Finite,
  results: Schema.Array(PlayerSearchResultView),
}) {}