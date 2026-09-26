/**
 * The Club Staff screen's view states. Exactly three exist — `loading`, `ready`, `error` — and
 * the five a spec import might have carried (`permission_limited`, `refreshing`,
 * `filtered_empty`, `empty`, `unavailable`) are dropped on the record, not modelled as future
 * hooks: one manager and no permission model; one immutable read re-run on navigation rather than
 * refreshed in place; no filters; and a club that exists in the save is always derivable, so an
 * unreachable club or save is the `error` state, never a fourth one. (Effort ticket 04.)
 */
export const CLUB_STAFF_VIEW_STATES = ["loading", "ready", "error"] as const;

export type ClubStaffViewState = (typeof CLUB_STAFF_VIEW_STATES)[number];

/** The `_tag` shape of a read that can still be waiting or failed — AsyncResult, structurally. */
export type ReadTag = "Initial" | "Success" | "Failure";

/**
 * Pick the screen's view state from the one read it makes. Structural over the `_tag` discriminant
 * so the same function drives both the unit tests and the live atom.
 *
 * The screen reads `getClubStaff` and nothing else: whose club it is rides on that same view
 * (`isUserClub`), so there is no second read to reconcile and no state where the page knows the
 * staff but not whose they are.
 *
 * - `error` — the read produced a typed failure (unknown club, missing save, or a transport or
 *   decode failure).
 * - `loading` — the read is still in flight.
 * - `ready` — the view has arrived, header included.
 */
export const clubStaffViewState = (staff: { readonly _tag: ReadTag }): ClubStaffViewState => {
  if (staff._tag === "Failure") return "error";
  if (staff._tag === "Initial") return "loading";
  return "ready";
};
