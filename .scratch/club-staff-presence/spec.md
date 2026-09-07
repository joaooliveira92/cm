# Spec: Club Staff — presence people, a club-scoped route, and the President's voice

Status: ready-for-agent

> Assembled by the `club-staff-presence` wayfinder map from its six resolved decision tickets
> (tickets 01-06, all `Status: resolved`). Every implementation decision below ends with its source
> ticket's gist, copied verbatim, and links the presence-staff Agent Note where the decision is
> grounded in it; decisions from tickets 02-06 that produced no separate note are stated in plain
> prose. Nothing here is implemented. The `PRESENCE_ROLES` union, the presence derivation, the
> `getClubStaff` read, the club-scoped route, the Club Staff screen, the news copy, the
> `CONTEXT.md` vocabulary, and the group C ledger are the work this spec hands off, not part of it.
>
> The presence-staff Agent Note remains `proposed`: this effort is plan-only, and the note's code
> acceptance criteria ship with the implementation below.

## Problem Statement

A club with no president is a thin world, and the codebase has no way to show who works at a club at
all. The staff model is exactly two bound roles — Coach and Scout — and its own rule says a stored
value nothing reads is not a real thing. Neither new role this effort wants has a mechanical term
available: Regimen already owns Condition decay, recovery, and injury severity outright, and the
Board's authority is deliberately institutional. So a President and a Physio have no formula to bind
to and no number to carry, which is precisely what makes them hard to justify under the existing
rule — and yet a named person is exactly what the world is missing.

The reader that justifies them does not exist either. Every screen in this app is scoped to the
save, none to a club: there is no Club Staff screen, no route that takes a club id, and no way to
reach a rival's backroom from the league table. The Board speaks institutionally — *"The board has
issued a warning"* — with no face behind it, so the warning and the dismissal that end careers are
voices without a person.

Underneath sit the consequences of adding people to a world that is reproducible from a seed. The
existing staff stream is order-sensitive and load-bearing for every shipped save, so a new draw
inserted into it would change the backroom of every existing save. The two naming precedents in the
codebase disagree — players draw nationality and can be foreign; staff index name pools directly and
are always domestic. And the `staff_role` check constraint permits exactly two values and must go on
saying so, which leaves the new roles needing their own type.

Finally, the group C import describes screen 38 as a contract-holding staff bureau — 24 staff with
contracts, workload, vacancies, responsibilities, search, and a permission model — none of which this
project has ever decided to build, and some of which it deliberately cut.

## Solution

A **Club Staff** screen for any club in the world, and the generation model behind it: a **President**
and a **Physio** as presence-only people — a name and a role and nothing else — **derived on demand
from the World Seed and the club's canonical id and never stored**, beside the existing bound Coach
and Scouts, which the screen re-derives rather than reads from rows. The page is the app's first
club-scoped route, reached from the league table, and it is the reader that justifies the presence
people. The President also gains a voice in the board news, giving the President a reader that ships
today while the screen does not.

**Presence Staff are a pure function of the World Seed and the club id.** Every club in the world has
them, at every Simulation Depth, at zero storage cost and zero world-generation cost. Each person
derives from their own seed — `deriveSeed(worldSeed, "presence", "<clubId>:president")` and the same
shape for the physio — so adding a role later changes nobody else's name, and neither person touches
the order-sensitive `staff` stream that every shipped save depends on. They draw domestic names from
`NAME_POOLS[clubNation]` like staff, with no nationality drawn, because no surface would display one.
Nothing varies by Stature Tier: the tier owns quality and presence people have none. The `staff_role`
check constraint stays honest at `coach` and `scout`; `PRESENCE_ROLES` sits beside an unchanged
`StaffRole`, and a `ClubPersonRole` union serves a caller that needs both.

**One function answers who works at a club, for any club.** A pure composing function in
`rules/staff.ts` takes the club id, Stature Tier, nation, and world seed and returns all four people
as the uniform shape `{ role, firstName, lastName }`, grouped by department. `generateStaff` is
unchanged — its stream is load-bearing — and the bound two are always re-derived, never read from the
`staff` table, so the screen answers for `results-only` clubs that have no rows and agrees with the
rows by construction wherever they exist. The renderer reaches this through the RPC surface like
every other club-scoped read.

**A club-scoped route, `/career/$saveId/club/$clubId/staff`.** The navigation adapter gains one
closed destination carrying the save id and club id; the `club/$clubId` segment is reserved for every
club screen that follows. The league table becomes the single entry point this effort. The page is a
read-only list of four named people under four department headings, with a club header that names the
club and marks a rival one, in exactly three states.

**The President names the board's warnings and dismissals.** The two messages that end or threaten a
career gain the President's name, with the name derived in the main process and handed to the news
projection; the Board Objective verdict stays institutional. Because the name is derived and fixed,
the retroactive re-voicing of old messages in an existing save is fine and is said so.

**The group C import is reconciled.** A ledger records that this effort ships screen 38 alone —
contracts, workload, vacancies, responsibilities, search, and the permission model out of scope — and
marks the other fifteen screens unreconciled, so a later reader does not read silence as "nothing to
reconcile".

## User Stories

1. As a manager, I want to see a named President at my club, so that the Board that sets my objective
   and can sack me has a face rather than being an abstraction.
2. As a manager, I want to see a named Physio at my club, so that the medical staff is a person rather
   than an absent department.
3. As a manager, I want every club in the world to have a President and a Physio, so that no club
   feels empty whether or not anyone manages it.
4. As a manager, I want my club's President and Physio to be the same people whenever I look, so that
   the world is consistent across a career.
5. As a manager, I want my club's President and Physio to be the same people if I leave the club and
   return, so that the backroom does not reshuffle on my return.
6. As a manager, I want to see who works at any club from the league table, so that I can look at a
   rival's backroom mid-season.
7. As a manager, I want the Club Staff page to tell me which club I am looking at, so that I can tell
   a rival club's staff from my own.
8. As a manager, I want the Club Staff page to mark when I am looking at another club, so that I am
   never confused about whether the staff on screen are mine.
9. As a manager, I want to see my club's staff grouped by department, so that the page reads as a
   club structure rather than a flat list.
10. As a manager, I want each staff row to show the person's name and role, so that the page carries
    exactly what it means.
11. As a manager, I want a Coach row and a Physio row to show the same amount of thing, so that no row
    means more or less than another.
12. As a manager, I want the page to work with a keyboard alone, so that I can reach and read any club
   's staff without a mouse.
13. As a manager using a screen reader, I want to hear which club's staff I am viewing first, so that
    I do not mistake a rival's page for my own.
14. As a manager, I want a clear message if the club or save cannot be found, so that I am never left
    looking at an empty or broken page.
15. As a manager, I want to return from a club's staff page the way I came, so that I stay on my own
    club's clock.
16. As a manager, I want the President to be the one who warns me when my job is at risk, so that the
    warning carries the face of the Board.
17. As a manager, I want the President to be the one who dismisses me, so that the dismissal is spoken
    by the same person who warned me.
18. As a manager, I want the Board Objective verdict to stay institutional, so that setting and judging
    the objective is the Board's act rather than a person's.
19. As a manager, I want the name in an old warning to be the same President I see today, so that the
    board news is consistent with the staff page.
20. As a manager, I want a `results-only` club to still show its President and Physio, so that every
    club has a staff page even where no squad was loaded.

## Implementation Decisions

- **Presence Staff are a name and a role, derived per-role from the World Seed and the club id,
  domestic, invariant across Stature Tier, and never stored.** A President and a Physio are a pure
  function of the World Seed and the club's canonical id, computed when a screen asks; every club in
  the world has them at every Simulation Depth, at zero storage cost and zero world-generation cost.
  **A Presence Staff member is a name and a role, derived per-role from the World Seed and the club
  id, domestic, invariant across Stature Tier, and never stored.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-07-presence-staff-are-derived-never-stored.md).

- **Per-role seeds keep the load-bearing staff stream untouched.** Each presence person derives from
  their own seed, `deriveSeed(worldSeed, "presence", "<clubId>:president")` and the same for the
  physio; neither touches `deriveSeed(worldSeed, "staff", clubId)`, whose draw order every existing
  save's backroom depends on. Adding a fifth role later changes nobody else's name. The cost is one
  extra `deriveSeed` call per person. **Per-role seeds, because the existing stream is a landmine.**
  See [Agent Note](../../.agents/notes/proposed/feature/2026-09-07-presence-staff-are-derived-never-stored.md).

- **Domestic names, because a nationality would be a value nothing reads.** Presence Staff draw from
  `NAME_POOLS[clubNation]` directly, following the staff precedent rather than the player
  migration-weighted one; no nationality is drawn because no surface would display one. The
  players-versus-staff divergence is recorded rather than repaired, because changing the bound staff
  draw would alter every shipped save's backroom. **Domestic names, because a nationality would be a
  value nothing reads.** See [Agent Note](../../.agents/notes/proposed/feature/2026-09-07-presence-staff-are-derived-never-stored.md).

- **Nothing varies by Stature Tier.** Presence Staff have no quality for the tier to own; a
  tier-varying job title would ship the glossary-banned **Chairman** as a big-club variant, and
  tier-varying name pools are unfalsifiable. **Nothing varies by Stature Tier.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-07-presence-staff-are-derived-never-stored.md).

- **Two role unions keep the check constraint honest.** `STAFF_ROLES` and `StaffRole` keep meaning
  exactly `coach` and `scout`, matching `check("staff_role", oneOf("role", ["coach", "scout"]))`;
  `PRESENCE_ROLES` and `PresenceRole` cover `president` and `physio`; `ClubPersonRole` serves a
  caller that needs both. The derivation returns `{ role, firstName, lastName }` — `GeneratedStaff`
  minus `quality` — so both tiers produce the same shape of person. **Two role unions, so the check
  constraint stays honest.** See [Agent Note](../../.agents/notes/proposed/feature/2026-09-07-presence-staff-are-derived-never-stored.md).

- **Both roles live in `rules/staff.ts`.** Two kinds of one concept, one file; the separation that
  matters is the seed, and it is structural already. **Both roles live in `rules/staff.ts`.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-07-presence-staff-are-derived-never-stored.md).

- **One function composes the whole club, and the read is a main-process RPC.** A pure
  `deriveClubStaff({ clubId, statureTier, clubNation, worldSeed })` in `rules/staff.ts` returns the
  four people as `{ role, firstName, lastName }` grouped by department through a `ROLE_DEPARTMENT`
  map (executive, coaching, recruitment, medical); `generateStaff` is unchanged. A new RPC
  `getClubStaff(saveId, clubId)` returns `ClubStaffView { club, groups: [{ department, members:
  [{ role, firstName, lastName }] }] }`, erroring with `ClubNotFoundError` for an unknown club. The
  bound two are always re-derived, never read from the `staff` table: deriving is the path that
  answers for every club, and agreement with the rows is by construction. The renderer never derives
  directly — it lacks the world seed, tier, and nation — so every club-scoped read stays on the RPC
  surface. The human's own club shows exactly one derived coach and cannot show a different one than
  the scouting screen names, because the row that screen reads was materialised from this same call.
  (Ticket 02.)

- **A closed `clubStaff` destination introduces the reusable `club/$clubId` segment.** The navigation
  adapter's `CareerDestination` gains `{ type: "clubStaff", saveId, clubId }`, resolving to
  `/career/$saveId/club/$clubId/staff`; the club segment is reserved for future club screens.
  `clubStaff` is a leaf in its own right — the codebase's pattern is one union member per navigable
  surface, with URL nesting shared where a parent exists (the `tactics`/`tacticsEditor` pair) — and a
  `club` parent destination is added only when a second club surface exists. The league table rows
  become clickable, the single entry point this effort; fixture and transfer rows stay unclickable
  and are recorded as deferred. Back is the shell's existing `g b` real router history, so no new
  control and no chrome change. The registry gains one route under the save parent with a fixed
  `screenId` of `clubStaff`; the focus coordinator works unchanged because it keys on the screen id,
  never the club id; the keymap changes nothing because `clubStaff` is a drill-down sub-surface, not
  a top-level screen (no `g` binding, not in `CAREER_SCREEN_TYPES`), the same rule `tacticsEditor`
  follows. A `$clubId` that names no club is the RPC's `ClubNotFoundError` rendered by the screen,
  never a redirect. (Ticket 03.)

- **The page is four department groups, name and role per row, in three states.** Department grouping
  earns its keep: it is what sells the page as a club's backroom rather than four unrelated rows, and
  it is where a future role would visibly slot. Four `<h2>` groups in fixed order Executive → Coaching
  → Recruitment → Medical, each a labelled list; each row renders the name with the role title as its
  accessible text, so a reader never infers the role from the heading. No row shows a quality — the
  wire is the uniform person shape, so a Coach row and a Physio row mean exactly the same amount of
  thing. Exactly three states survive — `loading`, `ready`, `error` — and the other five the import
  names (`permission_limited`, `refreshing`, `filtered_empty`, `empty`, `unavailable`) are dropped on
  the record: one manager and no permission model, one immutable read re-run on navigation rather
  than refreshed in place, no filters, and a club that exists in the save is always derivable, so an
  unreachable club or save is the `error` state. (Ticket 04.)

- **The page says whose club it is, out loud.** The header names the club through the `displayNames`
  seam and, when the club is not the user's, shows an explicit `[Not your club]` marker; the user's
  own club keeps the app's implicit default. The header is the `<main>` region's label, so an
  assistive user hears the club name and the foreign marker from the first thing read. The list is
  the whole page, so region labelling and reading order are the design: rows sit in DOM order under
  their heading and are not focusable, because the page is a terminal list that links nowhere;
  keyboard arrival lands on the club header, and `g b` leaves the way the entry point came in.
  (Ticket 04.)

- **The President names the warning and the dismissal; the verdict stays institutional.** The copy
  for `ManagerWarned` and `ManagerSacked` gains the President's name ("Alan Reyes has issued a
  warning"; the sacking keeps the club name and the objective-miss count its high-priority mechanic
  depends on). `BoardObjectiveJudged` stays institutional — setting and judging the Board Objective
  is the Board acting on its own instrument, and personifying it would blur the face-versus-
  institution line. (Ticket 05.)

- **The President's name is derived in the main process, never ridden on the event.** The news
  projection stays pure and takes facts; the main-process news query already resolves club context
  through the `displayNames` seam, and that is where `presidentName` is derived and added to
  `NewsClubContext`, with the copy table formatting it. Messages projected years later name the same
  person automatically because the President is a pure function of the seed, club id, and nation,
  fixed for the life of the career. The retroactive re-voicing of an existing save is fine and is
  recorded, because the change re-voices the voice and never the person. (Ticket 05.)

- **The group C ledger reconciles screen 38 and marks the rest unreconciled.** A
  `RECONCILIATION.md` ships beside the group C screens with a preamble stating plainly that it covers
  screen 38 alone and that silence about screens 33-37 and 39-49 means not-yet-reconciled, not
  nothing-to-reconcile. Screen 38 is classified with the group A/B vocabulary: the read-only
  department-grouped list and the viewed-club-independence clause survive; contracts, workload,
  vacancies, responsibilities, search, the permission and knowledge model, revisions, and the eight
  view states are out of scope or contradicted, each anchored to the decision that disposes of it;
  and the President, Physio, and Executive department — which the import never asked for — are
  recorded as this effort's additions, not the import's omissions. The import file is untouched.
  (Ticket 06.)

## Testing Decisions

A good test here asserts an observable property of the world or the page, never the shape of the code
that produced it. The derivation is pure and lives in `packages/shared`, so the highest-value tests
are unit tests over observable invariants; the read path, route, and page are covered at their seams
— the RPC round-trip and the renderer screen — following the repo's existing mirror-layout tests.

Prior art in the repo: `packages/shared/test/rules/staff.test.ts` already covers `generateStaff`
determinism and name-pool reuse, and is the natural home for the presence derivation's invariants;
`apps/desktop/test/main/career/staff.test.ts` exercises `materialiseStaff` against the database;
`apps/desktop/test/main/db/schema.test.ts` asserts the `staff_role` check constraint text; and the
renderer screen tests under `apps/desktop/test/renderer/<feature>/` are the pattern for the Club
Staff screen. The contracts round-trip fixture
(`packages/contracts/test/roundtrip.test.ts`) must carry the new `ClubStaffView` wire shape, per the
wire-shape rule in `packages/AGENTS.md`.

The behaviours to observe:

- **Presence determinism and identity.** The same club yields identical President and Physio across
  two independent derivations, and across a career in which the club is taken, left, and taken again.
- **No cross-stream interference.** Deriving the physio does not read or advance the president's
  stream; neither presence person touches `deriveSeed(worldSeed, "staff", clubId)`; and every
  existing determinism test over generated staff passes unchanged, byte for byte.
- **No duplication and no mismatch on the human's club.** The Club Staff view for the user's own club
  shows exactly one coach, and that coach is the same person the scouting screen names (the row was
  materialised from the same derivation).
- **Role sets and constraint honesty.** `PRESENCE_ROLES` is exactly `["president", "physio"]`;
  `STAFF_ROLES` is unchanged at `["coach", "scout"]`; and the `staff_role` check constraint still
  permits exactly those two values. No schema change — no table, column, or migration — is added by
  this work.
- **Every club at every depth.** A `results-only` club yields a President and a Physio like any
  other.
- **No name collision within the presence pair.** A President and a Physio at one club never share a
  full name.
- **The RPC read path.** `getClubStaff` returns the four people grouped by department for any club in
  the save and errors with `ClubNotFoundError` for a club id that names nothing; the wire shape
  round-trips.
- **The route.** Navigating to `/career/$saveId/club/$clubId/staff` lands on the Club Staff screen;
  `g b` returns to the page the entry point came from; an unknown club renders the error state, never
  a redirect.
- **The President's voice.** The `ManagerWarned` and `ManagerSacked` messages name the same President
  across a projection run years apart, and the `BoardObjectiveJudged` message carries no personal
  name.
- **The ledger.** The group C `RECONCILIATION.md` resolves as a link (the `verify-md-links` gate) and
  marks every screen other than 38 not-yet-audited.

## Out of Scope

Everything the map placed out of scope stays there and is not restated here. The items closest to
this spec's edge, because a reader will expect them:

- **Staff turnover.** Presidents being replaced needs an event, a trigger, and career state to store,
  which would undo the derived-on-read model. The first thing to revisit if the world feels static.
- **A President number that feeds the Board.** It changes when careers end, the highest-stakes
  mechanic in the game, and would reopen board objectives and manager sacking.
- **A staff profile screen** (group D, screens 64-68). Under presence-only there is nothing to show
  that the list row does not already carry.
- **Assistant Manager, Director of Football, and coaching specialisms.** Rejected by name in the
  staff note.
- **Staff contracts, wages, hiring, firing, vacancies, and responsibilities.** Already cut repo-wide;
  screen 38 asks for all of them and gets none.
- **The rest of the group C ledger** (fifteen other screens) and the whole of group K.
- **Growing the name pools.** Curation is already owed by player provenance; this effort makes the
  case sharper and still does not own it.
- **Reconciling player naming with staff naming.** The players-versus-staff nationality divergence is
  recorded rather than repaired, because changing the bound staff draw would alter every shipped
  save's backroom. A deliberate non-fix.
- **Entry points beyond the league table.** Fixture and transfer rows naming clubs stay unclickable
  this effort; they are the same interaction with no added coverage.

## Further Notes

**The screen is the reader the whole effort rests on.** Presence Staff are defensible only because
the Club Staff screen and the President's board copy are this effort's destination. If the screen is
cut and the news copy is not, the Physio loses its only reader and should be cut with it — the
President survives on the news copy alone. That is the failure mode to watch, and it is why the map
blocked the reconciliation ticket on the page design.

**The widened rule is easier to widen again.** "Some shipped surface reads it" admits far more than
"a formula reads it", and the next role will arrive arguing that a page could show it. The set is
closed at four deliberately; reopening it needs the same argument this note made, not a reference to
it.

**Two staff-naming behaviours coexist knowingly.** Players can be foreign and no Staff member ever
is. Recorded rather than fixed, and it will read as an oversight to anyone who finds it without this
paragraph.

**Name collisions will look like bugs before the pools grow.** Roughly 1 in 400 club pages will show
two people sharing a name at today's pool sizes, falling to 1 in 20,000 at the target size.

**Nothing enforces that a derived person is cheap.** The derivation is called per club per page view
rather than cached, which is correct at four people and would not be at forty.

**The note's relationships stand.** The staff-entity note is partially superseded and mostly ratified
(its two bindings, the no-market stance, static quality, one-coach-N-scouts, and every rejected role
stand; the role set is no longer exactly two). Player provenance is untouched and its name pools are
reused as-is. Simulation depth is partially superseded: a `results-only` club now has a President and
a Physio, and the no-depth-branch property is preserved rather than weakened. The no-onboarding-inbox
premise — *"there are no staff"* — was already false and is now further from true.
