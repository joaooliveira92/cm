import { Schema } from "effect";
import { AttributeFiguresSchema } from "./players.js";
import { ClubSummary } from "./clubs.js";
import { PlayerId } from "./ids.js";
import { PlayerPositionView } from "./squad.js";
import { PlayerFigureSchema } from "./transfers.js";

/**
 * A Player as an any-club squad shows him — the same knowledge rule as the transfer market and the
 * Player screens (Agent Note 2026-09-19, tickets 09/10): every figure is an exact value for the
 * manager's own club, and an Attribute Range by the human club's Scouting Progress below Fully
 * Scouted. The wire carries a `KnownFigure` for `overallRating` and every Attribute, never both an
 * exact number and a range, so no surface can read the exact figure of a Player the manager has not
 * fully scouted.
 *
 * Deliberately narrower than `SquadPlayerView`: a rival's Condition, Training Focus and Position
 * Ratings are not carried, because the Player read discloses none of them. The squad lists the same
 * facts that read publishes — name, age, position with Familiarity, nationality, birthplace — and
 * nothing it withholds (CONTEXT.md, Scouting Progress / Attribute Range).
 */
export class ClubSquadPlayerView extends Schema.Class<ClubSquadPlayerView>("ClubSquadPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  attributes: AttributeFiguresSchema,
  positions: Schema.Array(PlayerPositionView),
  overallRating: PlayerFigureSchema,
  nationality: Schema.String,
  birthplace: Schema.NullOr(Schema.String),
}) {}

/**
 * Any club's squad (Screen 35): the club, whose it is, and its Players read by the human club's
 * Scouting Progress. `isUserClub` rides along for the same reason it does on `ClubStaffView`: one
 * read answers the whole page, so the screen marks a foreign club `[Not your club]` and renders
 * exact figures for the manager's own without a second read to reconcile.
 */
export class ClubSquadView extends Schema.Class<ClubSquadView>("ClubSquadView")({
  club: ClubSummary,
  isUserClub: Schema.Boolean,
  players: Schema.Array(ClubSquadPlayerView),
}) {}