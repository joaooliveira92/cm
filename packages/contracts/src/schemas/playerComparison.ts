import { GOALKEEPING_ATTRIBUTES, OUTFIELD_ATTRIBUTES } from "@cm-clone/shared";
import { Schema } from "effect";

import { ClubId, PlayerId } from "./ids.js";
import { PlayerPositionView } from "./squad.js";
import { PlayerFigureSchema } from "./transfers.js";

/**
 * The comparison's per-Attribute figures: an exact value or an Attribute Range, by the reader's
 * Scouting Progress on the player, with the same optionality as `AttributeFiguresSchema`. Hidden
 * Attributes are deliberately absent — the profile may carry them for the match engine, but this
 * read exists only to draw a screen, and no UI group renders a hidden Attribute.
 */
export const ComparisonAttributeFiguresSchema = Schema.Struct({
  ...Object.fromEntries(
    OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, PlayerFigureSchema]),
  ),
  ...Object.fromEntries(
    GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, Schema.optional(PlayerFigureSchema)]),
  ),
});

/**
 * One column of the Transfer Target Comparison (Screen 129) — one named player, read by the human
 * club's Scouting Progress on him exactly as the search and profile reads do (Agent Note
 * 2026-09-19, ticket 12): the manager's own Players and Fully Scouted rivals exact, a rival or
 * Free Agent below that an Attribute Range on every visible Attribute, Overall Rating and Transfer
 * Value. `positions` gives the position/role-fit reading as categorical tiers, as everywhere else.
 *
 * `wage`, `contractExpiry` and `injuryStatus` are contract and fitness facts, not market readings,
 * so they are never ranged: `wage` is the contract's wage, `null` for a Free Agent (no contract);
 * `contractExpiry` is the "N years"/"Free Agent" label the screens already use; `injuryStatus` is
 * the fitness ledger's label. `nationality` is the canonical nation id, as in every player read.
 */
export class PlayerComparisonRowView extends Schema.Class<PlayerComparisonRowView>(
  "PlayerComparisonRowView",
)({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.Finite,
  nationality: Schema.String,
  clubId: Schema.NullOr(ClubId),
  clubName: Schema.NullOr(Schema.String),
  positions: Schema.Array(PlayerPositionView),
  attributes: ComparisonAttributeFiguresSchema,
  overallRating: PlayerFigureSchema,
  transferValue: PlayerFigureSchema,
  wage: Schema.NullOr(Schema.Finite),
  contractExpiry: Schema.String,
  injuryStatus: Schema.String,
}) {}

/**
 * The Transfer Target Comparison read (Screen 129): every player the renderer asked for, one row
 * each, in the caller's order. An empty `playerIds` answers with an empty `rows` — comparing
 * nothing is a rendered empty table, not an error.
 */
export class PlayerComparisonView extends Schema.Class<PlayerComparisonView>("PlayerComparisonView")({
  rows: Schema.Array(PlayerComparisonRowView),
}) {}