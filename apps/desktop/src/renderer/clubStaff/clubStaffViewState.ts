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

type ReadTags = { readonly _tag: ReadTag };

/** The own-club read discriminated on a Success carrying its value, structurally. */
export type OwnClubRead =
  | { readonly _tag: "Success"; readonly value: { readonly club: { readonly id: string } } }
  | { readonly _tag: "Initial" }
  | { readonly _tag: "Failure" };

/**
 * Pick the screen's view state from the two reads it makes: the club staff read itself and the
 * save's own-club identity (which club is the user's, for the header marker). Structural over the
 * `_tag` discriminant so the same function drives both the unit tests and the live atoms.
 *
 * - `error` — the club staff read produced a typed failure (unknown club, missing save, or a
 *   transport/decode failure). The own-club read failing is the same save telling the same
 *   lie, because both queries open the same file.
 * - `loading` — nothing actionable read yet: a read is still in flight.
 * - `ready` — the club staff view has arrived and the own-club identity it labels itself with has
 *   too, so the header can claim whose club this is from the first paint.
 */
export const clubStaffViewState = (input: {
  readonly staff: ReadTags;
  readonly squad: ReadTags;
}): ClubStaffViewState => {
  const { staff, squad } = input;
  if (staff._tag === "Failure") return "error";
  if (staff._tag === "Initial" || squad._tag === "Initial") return "loading";
  if (squad._tag === "Failure") return "error";
  return "ready";
};

/**
 * Whether the club being read is the user's own. Comparison by canonical id, never by display
 * name — two clubs can share a name in a pack and the `[Not your club]` marker must still tell
 * them apart. When the own-club identity is genuinely unknown (the read has not settled), the
 * neutral default is the user's own club, matching the page's own-club-first bias.
 */
export const isOwnClub = (
  view: { readonly club: { readonly id: string } },
  squad: OwnClubRead,
): boolean => squad._tag === "Success" && squad.value.club.id === view.club.id;