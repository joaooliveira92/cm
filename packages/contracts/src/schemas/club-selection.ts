import { Schema } from "effect";
import { SQUAD_QUALITY_BANDS } from "@cm-clone/shared";

import { StatureTierSchema } from "./clubs.js";
import { ClubId } from "./ids.js";
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
  /** The name of the League these clubs play in, already resolved through the save's content pack.
   *  Carried on the wire rather than imported by the renderer: a display name is the pack's to
   *  decide, and the renderer must never hold a second copy of that answer. */
  leagueName: Schema.String,
}) {}
