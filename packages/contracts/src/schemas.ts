import { Schema } from "effect";
import {
  FAMILIARITY_TIERS,
  FORMATIONS,
  GOALKEEPING_ATTRIBUTES,
  MENTALITY_OPTIONS,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  PRESSING_OPTIONS,
  ROLES,
  STATURE_TIERS,
  TEMPO_OPTIONS,
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

export const FormationSchema = Schema.Literals(FORMATIONS);
export const RoleSchema = Schema.Literals(ROLES);
export const MentalitySchema = Schema.Literals(MENTALITY_OPTIONS);
export const TempoSchema = Schema.Literals(TEMPO_OPTIONS);
export const PressingSchema = Schema.Literals(PRESSING_OPTIONS);

export class TacticSlot extends Schema.Class<TacticSlot>("TacticSlot")({
  position: PositionSchema,
  role: RoleSchema,
  playerId: Schema.String,
}) {}

/** The `ChangeTactics` command payload shape (ADR-0003 / ticket 03): a Formation, a Role and
 * player per slot, and the 3 Team Instructions. */
export class Tactic extends Schema.Class<Tactic>("Tactic")({
  formation: FormationSchema,
  slots: Schema.Array(TacticSlot),
  mentality: MentalitySchema,
  tempo: TempoSchema,
  pressing: PressingSchema,
}) {}

export class InvalidTacticError extends Schema.TaggedError<InvalidTacticError>()(
  "InvalidTacticError",
  {
    reason: Schema.String,
  },
) {}

export class TacticsScreenView extends Schema.Class<TacticsScreenView>("TacticsScreenView")({
  club: ClubSummary,
  squad: Schema.Array(SquadPlayerView),
  tactic: Schema.NullOr(Tactic),
}) {}

export class ClubNotFoundError extends Schema.TaggedError<ClubNotFoundError>()("ClubNotFoundError", {
  id: Schema.String,
}) {}

export class MatchNotFoundError extends Schema.TaggedError<MatchNotFoundError>()("MatchNotFoundError", {
  matchId: Schema.String,
}) {}

/** A Match Decider stream is keyed by a fresh matchId (ADR-0007); no fixture list exists yet
 * (ticket 15), so `startMatch` (ticket 13) lets the player pick any other club as a stand-in
 * opponent — see `listOpponentClubs`. */
export class MatchSummary extends Schema.Class<MatchSummary>("MatchSummary")({
  matchId: Schema.String,
  homeClubId: Schema.String,
  homeClubName: Schema.String,
  awayClubId: Schema.String,
  awayClubName: Schema.String,
}) {}

/** One rendered Commentary Line (ADR-0008) — minute is a separate field, never baked into `text`. */
export class CommentaryLineView extends Schema.Class<CommentaryLineView>("CommentaryLineView")({
  minute: Schema.Number,
  tag: Schema.String,
  text: Schema.String,
}) {}

/** `ResumeSimulation`'s response (ADR-0007 chunked resimulation, no RPC streaming): the next chunk
 * of already-rendered Commentary Lines after `cursor`, the new cursor, and whether the match has
 * reached `FullTimeWhistle`. */
export class ResumeSimulationView extends Schema.Class<ResumeSimulationView>("ResumeSimulationView")({
  matchId: Schema.String,
  cursor: Schema.Number,
  isComplete: Schema.Boolean,
  homeScore: Schema.Number,
  awayScore: Schema.Number,
  lines: Schema.Array(CommentaryLineView),
}) {}
