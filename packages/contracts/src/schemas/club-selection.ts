import { Schema } from "effect";
import { SQUAD_QUALITY_BANDS } from "@cm-clone/shared";

import { ClubColoursView, StatureTierSchema } from "./clubs.js";
import { ClubId, CompetitionId } from "./ids.js";
import { PositionSchema } from "./squad.js";

export const SquadQualityBandSchema = Schema.Literals(SQUAD_QUALITY_BANDS);

/** One line of the detail panel's top-five readout: the player's name and the Position they are
 * strongest in. Deliberately not a `SquadPlayerView` — no raw player object crosses this boundary,
 * because the panel needs a name and a Position, not twenty attributes. */
export class ClubSelectionTopPlayer extends Schema.Class<ClubSelectionTopPlayer>("ClubSelectionTopPlayer")({
  name: Schema.String,
  position: PositionSchema,
  overallRating: Schema.Finite,
}) {}

/** The detail panel's squad readout, computed at query time from the squad `getClubSelection`
 * already loads to derive Squad Quality. It ships with every row rather than behind a per-club
 * call, so selecting a club fills the panel with no second fetch and no loading state. */
export class ClubSelectionDetail extends Schema.Class<ClubSelectionDetail>("ClubSelectionDetail")({
  squadSize: Schema.Finite,
  averageAge: Schema.Finite,
  topPlayers: Schema.Array(ClubSelectionTopPlayer),
}) {}

export class ClubSelectionRow extends Schema.Class<ClubSelectionRow>("ClubSelectionRow")({
  clubId: ClubId,
  clubName: Schema.String,
  /** The league this club plays in. */
  leagueId: CompetitionId,
  /** The badge key for this club's crest, or null when the pack maps none. The renderer draws
   *  a colour-and-initials shield when the key is null or unknown. */
  badgeKey: Schema.NullOr(Schema.String),
  /** The club's colours, resolved through the save's content pack (or its id-derived fallback). */
  clubColours: ClubColoursView,
  statureTier: StatureTierSchema,
  boardObjectiveMin: Schema.Finite,
  boardObjectiveMax: Schema.Finite,
  squadQualityBand: SquadQualityBandSchema,
  transferBudget: Schema.Finite,
  wageBudget: Schema.Finite,
  detail: ClubSelectionDetail,
}) {}

export class ClubSelectionView extends Schema.Class<ClubSelectionView>("ClubSelectionView")({
  clubs: Schema.Array(ClubSelectionRow),
  /** The leagues the player selected, with their display names. */
  leagues: Schema.Array(Schema.Struct({
    leagueId: CompetitionId,
    leagueName: Schema.String,
  })),
}) {}
