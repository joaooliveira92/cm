import { Schema } from "effect";
import { STAFF_COACHING_RATINGS, STAFF_MENTAL_RATINGS } from "@cm-clone/shared";

import { ClubPersonRoleSchema, ClubSummary } from "./clubs.js";
import { ClubId, PlayerId } from "./ids.js";
import { PositionSchema, TrainingFocusSchema } from "./squad.js";
import { FormationSchema, MentalitySchema, PressingSchema, TempoSchema } from "./tactics.js";

/** The address of one person in a club's backroom — `<role>-<ordinal>`, as `staffKey` mints it.
 *  Carried as a plain string: main parses it, and a key naming no one is `StaffNotFoundError`. */
export const StaffKeySchema = Schema.String;

export class StaffNotFoundError extends Schema.TaggedError<StaffNotFoundError>()("StaffNotFoundError", {
  clubId: ClubId,
  key: Schema.String,
}) {}

const ratingsSchema = <K extends string>(keys: readonly K[]) =>
  Schema.Struct(Object.fromEntries(keys.map((key) => [key, Schema.Finite])) as Record<K, typeof Schema.Finite>);

export const StaffCoachingRatingsSchema = ratingsSchema(STAFF_COACHING_RATINGS);
export const StaffMentalRatingsSchema = ratingsSchema(STAFF_MENTAL_RATINGS);

export class StaffTacticsView extends Schema.Class<StaffTacticsView>("StaffTacticsView")({
  formation: FormationSchema,
  mentality: MentalitySchema,
  tempo: TempoSchema,
  pressing: PressingSchema,
  coachingEmphasis: TrainingFocusSchema,
}) {}

/** One earlier job. The club is named through the content pack like every other club name. */
export class StaffHistorySpellView extends Schema.Class<StaffHistorySpellView>("StaffHistorySpellView")({
  fromYear: Schema.Finite,
  toYear: Schema.Finite,
  club: ClubSummary,
  role: ClubPersonRoleSchema,
}) {}

/** One player in a coach's rankings: enough to draw the row without a second read. */
export class StaffRankedPlayerView extends Schema.Class<StaffRankedPlayerView>("StaffRankedPlayerView")({
  id: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  positions: Schema.Array(PositionSchema),
  age: Schema.Finite,
  condition: Schema.Finite,
}) {}

/** The squad, best first, as this person would pick it at one Position. */
export class StaffRankingView extends Schema.Class<StaffRankingView>("StaffRankingView")({
  position: PositionSchema,
  playerIds: Schema.Array(PlayerId),
}) {}

export class StaffRankingsView extends Schema.Class<StaffRankingsView>("StaffRankingsView")({
  players: Schema.Array(StaffRankedPlayerView),
  byPosition: Schema.Array(StaffRankingView),
}) {}

/**
 * Staff Profile: one staff member at any club, as the manager sees them. Every rating, preference
 * and biography line is derived presence (Agent Note 2026-09-28); `quality` is the one stored,
 * formula-read number and is `null` for Presence Staff.
 *
 * `rankings` is the coaching staff's view of the manager's own squad, and `null` for every other
 * club and role: a rival's players are read through Scouting Progress, and a ranking by their true
 * ratings would leak what scouting has not yet revealed.
 */
export class StaffProfileView extends Schema.Class<StaffProfileView>("StaffProfileView")({
  club: ClubSummary,
  isUserClub: Schema.Boolean,
  key: StaffKeySchema,
  role: ClubPersonRoleSchema,
  firstName: Schema.String,
  lastName: Schema.String,
  dateOfBirth: Schema.String,
  age: Schema.Finite,
  nationality: Schema.String,
  languages: Schema.Array(Schema.String),
  quality: Schema.NullOr(Schema.Finite),
  coaching: Schema.NullOr(StaffCoachingRatingsSchema),
  mental: Schema.NullOr(StaffMentalRatingsSchema),
  tactics: Schema.NullOr(StaffTacticsView),
  joined: Schema.String,
  history: Schema.Array(StaffHistorySpellView),
  rankings: Schema.NullOr(StaffRankingsView),
  /** True for the manager's own Assistant Manager while the Training Schedule is delegated to them
   *  (training-schedule-and-delegation 05) — the one duty a Presence Staff member carries. */
  plansTraining: Schema.Boolean,
}) {}
