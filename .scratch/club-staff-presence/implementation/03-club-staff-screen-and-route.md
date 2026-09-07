# 03: The Club Staff screen and its club-scoped route

**What to build:** the app's first club-scoped route and the screen it lands on. A `clubStaff`
destination carrying the save id and club id resolves to `/career/$saveId/club/$clubId/staff`, with
the `club/$clubId` segment reserved for every club screen that follows. The league table rows become
the single entry point: clicking a row — keyboard or pointer — reaches that club's staff page, and
`g b` returns the way the entry point came in via real router history. An unknown `$clubId` renders
the RPC's `ClubNotFoundError` as the screen's `error` state, never a redirect.

The page is a read-only list of four named people under four department headings — Executive,
Coaching, Recruitment, Medical — in a club header that names the club and marks a rival one
`[Not your club]`. Exactly three view states survive: `loading`, `ready`, `error`. The page is a
terminal, links-nowhere list: rows are not focusable, keyboard arrival lands on the club header
(the `<main>` region's label), and reading order is the design.

The slice's edge promise: the screen adds no new state of its own — it renders the three states the
`getClubStaff` read can produce, and the navigation surface changes by exactly one closed union
member and one route. No keymap change, no new `g` binding, and no chrome change: `clubStaff` is a
drill-down sub-surface like the tactics editor, not a tenth career screen.

**Decisions:**

- A closed `clubStaff` destination introduces the reusable `club/$clubId` segment. The navigation
  adapter's `CareerDestination` gains `{ type: "clubStaff", saveId, clubId }`, resolving to
  `/career/$saveId/club/$clubId/staff`. `clubStaff` is a leaf in its own right — the codebase's
  pattern is one union member per navigable surface — and a `club` parent destination is added only
  when a second club surface exists. The league table rows become clickable, the single entry point
  this effort; fixture and transfer rows stay unclickable and are recorded as deferred. Back is the
  shell's existing `g b` real router history. The registry gains one route under the save parent
  with a fixed `screenId` of `clubStaff`; the focus coordinator works unchanged because it keys on
  the screen id, never the club id; the keymap changes nothing because `clubStaff` is a drill-down
  sub-surface, not a top-level screen (no `g` binding, not in `CAREER_SCREEN_TYPES`). A `$clubId`
  that names no club is the RPC's `ClubNotFoundError` rendered by the screen, never a redirect.
  (Ticket 03.)
- The page is four department groups, name and role per row, in three states. Four `<h2>` groups
  in fixed order Executive → Coaching → Recruitment → Medical, each a labelled list; each row
  renders the name with the role title as its accessible text, so a reader never infers the role
  from the heading. No row shows a quality — the wire is the uniform person shape, so a Coach row
  and a Physio row mean exactly the same amount of thing. Exactly three states survive — `loading`,
  `ready`, `error` — and the other five the import names are dropped on the record. (Ticket 04.)
- The page says whose club it is, out loud. The header names the club through the `displayNames`
  seam and, when the club is not the user's, shows an explicit `[Not your club]` marker; the user's
  own club keeps the app's implicit default. The header is the `<main>` region's label, so an
  assistive user hears the club name and the foreign marker from the first thing read. The list is
  the whole page, so region labelling and reading order are the design: rows sit in DOM order
  under their heading and are not focusable, because the page is a terminal list that links
  nowhere; keyboard arrival lands on the club header, and `g b` leaves the way the entry point came
  in. (Ticket 04.)

**Blocked by:** 02 — the `getClubStaff` read the screen renders.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/renderer/navigation/destinations.ts`,
`apps/desktop/src/renderer/router/`, `apps/desktop/src/renderer/leagueTable/LeagueTableScreen.tsx`,
a new `apps/desktop/src/renderer/clubStaff/` feature folder (the screen, its RPC atom wiring via
`renderer/rpc`), and the renderer tests under `apps/desktop/test/renderer/clubStaff/`.

- [ ] `CareerDestination` gains `{ type: "clubStaff", saveId, clubId }`, resolving to
      `/career/$saveId/club/$clubId/staff`; the `club/$clubId` segment is reserved for future club
      screens.
- [ ] The route registry gains one route under the save parent with `screenId` of `clubStaff`,
      absent from `CAREER_SCREEN_TYPES` and the keymap (no `g` binding), matching the `tactics`
      editor's sub-surface treatment.
- [ ] League table rows are clickable — keyboard and pointer — and navigate to that club's staff
      page; fixture and transfer rows stay unclickable.
- [ ] `g b` returns to the page the entry point came from.
- [ ] An unknown `$clubId` renders the screen's `error` state with a clear message, never a
      redirect — navigation never validates the club id itself.
- [ ] The screen renders four departments in fixed order Executive → Coaching → Recruitment →
      Medical, each an `<h2>`-labelled list, with each row showing the name and its role title as
      accessible text; no row shows a quality.
- [ ] Exactly three states exist: `loading`, `ready`, `error`. No other view state ships or is
      left as a hook.
- [ ] The club header names the club through the `displayNames` seam and shows `[Not your club]`
      when the club is not the user's, absent for the user's own club; the header labels the
      `<main>` region.
- [ ] Rows are not focusable; keyboard arrival lands on the club header.
- [ ] `pnpm check:all` is green at this commit, and the desktop e2e suite passes where a screen
      changed.