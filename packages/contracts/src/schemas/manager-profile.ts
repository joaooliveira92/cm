import { Schema } from "effect";
import { MANAGER_ARCHETYPES } from "@cm-clone/shared";

import { ClubColoursView } from "./clubs.js";
import { ClubId, NationId } from "./ids.js";
import { TemplateNameSchema } from "./tactics.js";

export const ManagerArchetypeSchema = Schema.Literals(MANAGER_ARCHETYPES);

export class PillarDistribution extends Schema.Class<PillarDistribution>("PillarDistribution")({
  tacticalAcumen: Schema.Finite,
  influence: Schema.Finite,
  regimen: Schema.Finite,
  technicalCoaching: Schema.Finite,
}) {}

/** Immutable creation-time manager identity, never modified after commitCareer. */
export class ManagerProfileView extends Schema.Class<ManagerProfileView>("ManagerProfileView")({
  firstName: Schema.String,
  lastName: Schema.String,
  /** The manager's nationality, as a `nations` id, plus its resolved country name. The name is
   *  resolved in main because country names are factual geography read from code, not from a
   *  content pack. */
  nationalityId: NationId,
  nationalityName: Schema.String,
  /** ISO `YYYY-MM-DD`, matching `players.date_of_birth`. */
  dateOfBirth: Schema.String,
  /** The club the manager supports, if any. Optional: not every manager supports a club. */
  favoriteClubId: Schema.NullOr(ClubId),
  /** The favorite club's resolved display name, or null when none was chosen. */
  favoriteClubName: Schema.NullOr(Schema.String),
  /** The built-in Tactic Template the manager starts from, chosen at creation: his tactical
   *  identity. A new career's first Tactic loads it; it is not stored on the Tactic itself. */
  preferredFormation: TemplateNameSchema,
  /** A code-resolvable portrait key, null until a portrait asset set exists. */
  avatarPortraitKey: Schema.NullOr(Schema.String),
  /** The accent scheme the colour/initials fallback renders, as hex strings. */
  avatarPrimaryColor: Schema.String,
  avatarSecondaryColor: Schema.String,
  archetypeOrigin: ManagerArchetypeSchema,
  pillars: PillarDistribution,
}) {}

export class ManagerProfileNotFoundError extends Schema.TaggedError<ManagerProfileNotFoundError>()(
  "ManagerProfileNotFoundError",
  {},
) {}

export class InvalidPillarDistributionError extends Schema.TaggedError<InvalidPillarDistributionError>()(
  "InvalidPillarDistributionError",
  {
    errors: Schema.Array(Schema.String),
  },
) {}

/** Manager Profile screen (Screen 19). Profile identity plus the three save-scoped facts that frame
 * it — club, Season number, tenure length — and the Archived Save flag the status badge keys off.
 * Deliberately carries no Board Objective, Verdict, Consecutive-Miss Counter, or `ManagerOutcome`:
 * those are season-boundary judgments owned exclusively by Season Summary. */
export class ManagerProfileScreenView extends Schema.Class<ManagerProfileScreenView>(
  "ManagerProfileScreenView",
)({
  profile: ManagerProfileView,
  clubName: Schema.String,
  /** The club's badge key, resolved through the save's pack — null for fictional packs. */
  badgeKey: Schema.NullOr(Schema.String),
  /** The club's scheme, carried alongside its name because the career chrome reads this view for
   *  both: the header paints itself in `colours.primary`. */
  clubColours: ClubColoursView,
  seasonNumber: Schema.Finite,
  /** Seasons served with this club, counting the current one. */
  tenureSeasons: Schema.Finite,
  /** True once the save is an Archived Save (sacked or retired) — the badge and every guard key off
   * this single flag, never off the cause. */
  archived: Schema.Boolean,
}) {}
