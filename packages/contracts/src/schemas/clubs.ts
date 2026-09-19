import { Schema } from "effect";
import { PRESENCE_ROLES, STAFF_DEPARTMENTS, STAFF_ROLES, STATURE_TIERS } from "@cm-clone/shared";

import { ClubId } from "./ids.js";

export const StatureTierSchema = Schema.Literals(STATURE_TIERS);

/**
 * A foreground/background pair. Crosses the wire as a pair because contrast is a property of the
 * pair, never of either colour alone — see `clubColours.ts` in `@cm-clone/shared`.
 *
 * The values are CSS colours, unvalidated beyond being strings. Validating hex here would reject
 * the `rgb()`/`oklch()` forms a future pack may legitimately author, and the renderer's failure
 * mode for a malformed colour is an unpainted surface, not a crash.
 */
export class ColourPairView extends Schema.Class<ColourPairView>("ColourPairView")({
  foreground: Schema.String,
  background: Schema.String,
}) {}

/** A club's colours, already resolved through the save's content pack (or its id-derived fallback).
 *  `primary` and `secondary` are always present; the last two ranks are usually null. */
export class ClubColoursView extends Schema.Class<ClubColoursView>("ClubColoursView")({
  primary: ColourPairView,
  secondary: ColourPairView,
  tertiary: Schema.NullOr(ColourPairView),
  quaternary: Schema.NullOr(ColourPairView),
}) {}

export class ClubSummary extends Schema.Class<ClubSummary>("ClubSummary")({
  id: ClubId,
  name: Schema.String,
  statureTier: StatureTierSchema,
}) {}

export class ClubNotFoundError extends Schema.TaggedError<ClubNotFoundError>()("ClubNotFoundError", {
  id: ClubId,
}) {}

/**
 * A role in a club's whole backroom — Bound Staff (`coach`, `scout`) or Presence Staff
 * (`president`, `physio`). The `ClubPersonRole` union from `@cm-clone/shared` given a wire schema,
 * so the wire and the domain agree by construction and the `ClubStaffView` cannot carry a role the
 * derivation cannot produce.
 */
export const ClubPersonRoleSchema = Schema.Literals([...STAFF_ROLES, ...PRESENCE_ROLES] as const);

/** The department a Club Staff group is headed by, in the shared derivation's fixed order. */
export const StaffDepartmentSchema = Schema.Literals(STAFF_DEPARTMENTS);

/** One named person on the Club Staff screen — a role and a name, whether they carry a binding or
 * presence only. The uniform shape means a Coach row and a Physio row carry exactly the same amount
 * of thing. */
export class ClubStaffMemberView extends Schema.Class<ClubStaffMemberView>("ClubStaffMemberView")({
  role: ClubPersonRoleSchema,
  firstName: Schema.String,
  lastName: Schema.String,
}) {}

/** A department heading and the people under it. */
export class ClubStaffDepartmentGroupView extends Schema.Class<ClubStaffDepartmentGroupView>(
  "ClubStaffDepartmentGroupView",
)({
  department: StaffDepartmentSchema,
  members: Schema.Array(ClubStaffMemberView),
}) {}

/** Club Staff (Screen 38): who works at a club — its four people across both kinds, grouped by
 * department — for any club in the save. Every person is derived on read, so a `results-only` club
 * answers like any other and the view agrees with the `staff` rows wherever they exist. */
export class ClubStaffView extends Schema.Class<ClubStaffView>("ClubStaffView")({
  club: ClubSummary,
  /**
   * Whether this club is the one the manager manages, answered by the same read that names the
   * club. The screen marks a foreign club `[Not your club]`, and asking the save directly keeps
   * that a property of the club being read rather than a second read the screen has to reconcile:
   * one read, one failure to render, and no state where the page knows the staff but not whose
   * they are.
   */
  isUserClub: Schema.Boolean,
  groups: Schema.Array(ClubStaffDepartmentGroupView),
}) {}

/**
 * Club General Information (Screen 34): a club's identity and standing, for any club in the save.
 *
 * Deliberately short. The import asks for ownership, reputation, finances, facilities and history;
 * of those, only the ground and the club's standing have a model here, and a view that carried the
 * rest would be a screen inventing numbers. What is absent is recorded in the Group C ledger rather
 * than stubbed on the wire.
 *
 * `isUserClub` rides along for the same reason it does on `ClubStaffView`: one read, one failure to
 * render, and no state where the page knows the club but not whose it is.
 */
export class ClubInformationView extends Schema.Class<ClubInformationView>("ClubInformationView")({
  club: ClubSummary,
  isUserClub: Schema.Boolean,
  /** The club's home town, and the nation that town sits in — the club's nationality is its city's. */
  cityName: Schema.String,
  nationName: Schema.String,
  /** The ground. There is no stadium entity, so these are columns on the club, not a joined row. */
  stadiumName: Schema.String,
  /** Display only: nothing in the game reads capacity as a constraint. */
  stadiumCapacity: Schema.Number,
}) {}

