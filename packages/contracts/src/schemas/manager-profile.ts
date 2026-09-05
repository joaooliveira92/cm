import { Schema } from "effect";
import { MANAGER_ARCHETYPES } from "@cm-clone/shared";

import { ClubColoursView } from "./clubs.js";

export const ManagerArchetypeSchema = Schema.Literals(MANAGER_ARCHETYPES);

export class PillarDistribution extends Schema.Class<PillarDistribution>("PillarDistribution")({
  tacticalAcumen: Schema.Finite,
  influence: Schema.Finite,
  regimen: Schema.Finite,
  technicalCoaching: Schema.Finite,
}) {}

/** Immutable creation-time manager identity, never modified after commitCareer. */
export class ManagerProfileView extends Schema.Class<ManagerProfileView>("ManagerProfileView")({
  managerName: Schema.String,
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
