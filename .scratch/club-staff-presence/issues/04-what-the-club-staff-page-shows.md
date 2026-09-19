# 04: What the Club Staff page shows

Type: prototype
Blocked by: 02, 03
Status: resolved

## Question

The page is the reader that justifies the whole effort, so what it shows is the thing the binding
rule is now resting on. Import screen 38 asks for filters by department, contracts, workload,
availability, vacancies, responsibilities, staff search, and eight view states. This repo has none
of those and will ship none of them. What survives is a read-only list of four named people grouped
by department.

Build a rough prototype and settle against it:

- **The layout.** Four departments each holding one or more people, for a club that may or may not
  be yours. Whether department grouping earns its keep when three of the four hold exactly one
  person.
- **What a row carries.** Name and role is the floor. Whether a bound person shows anything a
  presence person cannot — a Coach has a quality the game reads, and showing it would make two rows
  on one page mean different amounts of thing.
- **The states that survive.** `loading`, `ready`, and `error` have referents. `permission_limited`,
  `refreshing`, `filtered_empty`, and `unavailable` mostly do not, and each should be either mapped
  onto something real or dropped on the record.
- **Whose club, said out loud.** The page must make it obvious you are looking at North United and
  not your own club, because every other screen in this app is implicitly yours.
- **Keyboard and screen reader.** This repo's screens are keyboard-first and the list is the whole
  page, so the reading order and the region labelling are the design, not a finishing pass.

Link the prototype from this ticket rather than pasting it in.

## Answer

**A read-only list of four named people under four department headings, framed by a club header
that names the club and marks a rival one, with exactly three view states.**
Prototype: [04-club-staff-page](../prototypes/04-club-staff-page.md).

- **The layout.** Department grouping earns its keep. Recruitment is the only department holding
  more than one person, but the grouping is what sells "this is a club's backroom" — the page reads
  as a club structure rather than four unrelated rows — and it is where a future role (the closed
  set) would visibly slot. Four `<h2>` groups in fixed order Executive → Coaching → Recruitment →
  Medical, each a labelled list under it.
- **What a row carries.** Name and role, uniformly, for all four rows. No quality on any row:
  ticket 02 fixed the wire as the uniform `{ role, firstName, lastName }` shape, so by construction
  a Coach row and a Physio row mean exactly the same amount of thing. Each row renders the name
  with the role title as its accessible text ("President", "Coach", …), so a reader never has to
  infer the role from the department heading.
- **The states that survive.** `loading`, `ready`, `error`. The other five are dropped on the
  record: `permission_limited` (one manager, no permission model), `refreshing` (the read is one
  immutable query re-run on navigation, never refreshed in place), `filtered_empty` and `empty`
  (no filters ship, and a four-person list is never empty), and `unavailable` (a club that exists
  in the save is always derivable; an unreachable club or save is the `error` state — the RPC's
  `ClubNotFoundError` — not a fourth state).
- **Whose club, said out loud.** The page header names the club (resolved through the
  `displayNames` seam) and, when the club is not the user's, shows an explicit `[Not your club]`
  marker. Your own club stays the app's implicit default — every other screen is implicitly yours,
  so neutrality is the home-club case, and the lateral case is the one that must be loud. The
  header is the `<main>` region's label, so an assistive user gets the club name and the foreign
  marker from the first thing read.
- **Keyboard and screen reader.** The list is the whole page, so region labelling and reading order
  are the design: `<main>` labelled by the club heading; four group headings in fixed order; rows
  in DOM order under their heading and not focusable (the page is a terminal, links-nowhere list).
  Keyboard arrival lands on the club header (`requestFocus` on the `clubStaff` screen scope), and
  `g b` leaves the way the entry point came in.
