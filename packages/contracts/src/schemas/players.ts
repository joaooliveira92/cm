import {
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
} from "@cm-clone/shared";
import { Schema } from "effect";
import { ClubSummary } from "./clubs.js";
import { ClubId, FixtureId, MatchId, PlayerId } from "./ids.js";
import { MatchPlayerCard } from "./matchStats.js";
import { PositionSummaryFields, PlayerPositionView } from "./squad.js";
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
  ...PositionSummaryFields,
  attributes: AttributeFiguresSchema,
  overallRating: PlayerFigureSchema,
  transferValue: PlayerFigureSchema,
  club: ClubSummary,
  contractExpiry: Schema.String,
  injuryStatus: Schema.String,
}) {}

// ---------------------------------------------------------------------------
// Player Form (map ticket 19): recent games and the five-rating form strip
// ---------------------------------------------------------------------------

/** What a Form row is for the player: he played, he was an unused substitute in a recorded matchday
 *  squad, the club's match has lines but he was not named, or the fixture has no player record at
 *  all (a `results-only` club, no engine timeline). The screen renders each as its own text. */
export const PlayerFormRowState = Schema.Literals([
  "played",
  "unusedSubstitute",
  "notSelected",
  "noRecord",
]);
export type PlayerFormRowState = Schema.Schema.Type<typeof PlayerFormRowState>;

/** One played fixture of the selected club this season, with the player's line in it. Every count is
 *  zero and `rating` is null when he did not play; `state` says which kind of absence. */
export class PlayerFormGameRow extends Schema.Class<PlayerFormGameRow>("PlayerFormGameRow")({
  fixtureId: FixtureId,
  /** ISO `YYYY-MM-DD`, the fixture's date. */
  date: Schema.String,
  opponentClubName: Schema.String,
  isHome: Schema.Boolean,
  state: PlayerFormRowState,
  /** The player's club's result; null only for a fixture with no player record at all (a
   *  `results-only` club), which has no score to read. Kept on a "Not selected" row. */
  result: Schema.NullOr(Schema.Literals(["win", "draw", "loss"])),
  card: MatchPlayerCard,
  started: Schema.Boolean,
  cameOnMinute: Schema.NullOr(Schema.Finite),
  wentOffMinute: Schema.NullOr(Schema.Finite),
  keyPasses: Schema.Finite,
  offsides: Schema.Finite,
  fouls: Schema.Finite,
  assists: Schema.Finite,
  shots: Schema.Finite,
  shotsOnTarget: Schema.Finite,
  saves: Schema.Finite,
  goals: Schema.Finite,
  /** The recorded-defending counts (match-engine ticket 18), null on a pre-change row; the Form
   *  table draws them between Key and Off. */
  tacklesWon: Schema.NullOr(Schema.Finite),
  tacklesAttempted: Schema.NullOr(Schema.Finite),
  headers: Schema.NullOr(Schema.Finite),
  headersWon: Schema.NullOr(Schema.Finite),
  interceptions: Schema.NullOr(Schema.Finite),
  runs: Schema.NullOr(Schema.Finite),
  foulsSuffered: Schema.NullOr(Schema.Finite),
  /** The Match Rating from the same fold the stats table reads, or null when he did not play. */
  rating: Schema.NullOr(Schema.Finite),
  /** Set only for the user's own fixture, whose Match Report the row opens; null for any other. */
  matchId: Schema.NullOr(MatchId),
}) {}

/** One club the player has a line for this season, an option in the Team selector. */
export class PlayerFormClubOption extends Schema.Class<PlayerFormClubOption>("PlayerFormClubOption")({
  clubId: ClubId,
  clubName: Schema.String,
}) {}

/** One competition's season totals: League, Cup, Continental (when appeared) and Overall. */
export class PlayerFormSeasonRow extends Schema.Class<PlayerFormSeasonRow>("PlayerFormSeasonRow")({
  kind: Schema.Literals(["league", "cup", "continental", "overall"]),
  label: Schema.String,
  starts: Schema.Finite,
  subs: Schema.Finite,
  goals: Schema.Finite,
  assists: Schema.Finite,
  mom: Schema.Finite,
  yellowCards: Schema.Finite,
  redCards: Schema.Finite,
  shots: Schema.Finite,
  shotsOnTarget: Schema.Finite,
  fouls: Schema.Finite,
  /** Tackles attempted (won plus fouls) and fouls suffered; null when a contributing line predates
   *  the recorded-defending events (match-engine ticket 18), so the block reads "-". */
  tackles: Schema.NullOr(Schema.Finite),
  foulsSuffered: Schema.NullOr(Schema.Finite),
  /** Mean Match Rating over appearances, two decimals, or null when he made none. */
  averageRating: Schema.NullOr(Schema.Finite),
}) {}

/** A player's Form read: his clubs, the selected club's played fixtures this season with his line in
 *  each, the five-rating form strip, and the season block. */
export class PlayerFormView extends Schema.Class<PlayerFormView>("PlayerFormView")({
  playerId: PlayerId,
  clubs: Schema.Array(PlayerFormClubOption),
  selectedClubId: Schema.NullOr(ClubId),
  games: Schema.Array(PlayerFormGameRow),
  /** The Match Ratings of his last five appearances across all his clubs, oldest to newest. */
  formRatings: Schema.Array(Schema.Finite),
  /** A goalkeeper: the Sav column is drawn. */
  goalkeeper: Schema.Boolean,
  /** Season totals by competition: League, Cup, Continental when he appeared in one, and Overall. */
  season: Schema.Array(PlayerFormSeasonRow),
}) {}