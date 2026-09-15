# Map: club-staff-presence

Label: wayfinder:map

## Destination

A **spec**, at `spec.md` in this effort's own directory, describing a read-only **Club Staff** screen
for any club in the world, and the generation model behind it: a **President** and a **Physio** as
presence-only people, derived rather than stored, beside the existing bound **Coach** and **Scout**.
Plus the reconciliation the change requires — `CONTEXT.md`'s Staff vocabulary, a successor Agent
Note, and screen 38's rows in a new group C ledger.

Plan-only. The map is done when nothing is left to decide and the spec can be handed to
`/to-spec` → `/to-tickets` → `/implement`.

## Notes

- **Domain**: `packages/shared/src/rules/staff.ts` (the derivation), the `@cm-clone/desktop`
  renderer and its navigation adapter (the screen), `packages/shared/src/news/newsCopy.ts` (the
  President's voice), and `CONTEXT.md`'s Staff and Board sections.
- **Skills every session should consult**: `grilling` and `domain-modeling` by default;
  `effect-code` for any session touching source; `vercel-composition-patterns` for the screen's
  component split; `doc-standards` for the ledger and `CONTEXT.md` edits.
- **This effort widens a rule rather than breaking one.** Read
  [staff are two bound roles](../../.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md)
  before any session. Its two bindings, both hard invariants, the no-market stance, the static-quality
  rule, and one-coach-N-scouts all survive untouched. The successor note is a **partial**
  supersession and both stay active.

### Settled during charting (2026-09-07)

Twenty-one questions, answered breadth-first before any ticket existed. These frame the tickets;
they are not open questions and no session re-litigates them.

- **A shipped surface that reads a value justifies it.** The binding rule stops meaning "mechanical
  binding" and starts meaning "something ships that reads this". A value stored for a screen that
  does not exist yet is still dead.
- **The President is the Board's face**, not a second authority. The Board already sets Board
  Objective and fires **Manager Warned** and **Manager Sacked**; the President is who those events
  are speaking as.
- **Four roles, one per department**: President (Executive), Coach (Coaching), Scout (Recruitment),
  Physio (Medical). Closed at the end of this effort. Assistant Manager, Director of Football, and
  coaching specialisms stay rejected.
- **Presence people are derived, never stored.** A pure function of world seed + club id, computed
  when a screen asks. No rows, no world-generation cost, and every club in the world has them.
- **Stored-vs-derived is a statement about identity, not existence.** One function answers "who
  works at this club" for any club; the `staff` rows are a materialisation of its bound subset,
  existing because a scouting assignment needs a stable id to point at.
- **The President carries a name and no number.** A number that fed the Board would reopen the
  career-ending mechanic; a number that fed nothing is the dead column the rule exists to prevent.
- **Presence people never change.** Fixed for the life of a career, like Staff.
- **The page reaches any club**, from surfaces that already name clubs — league table, fixtures,
  transfers — via the app's first club-scoped route, `club/$clubId/staff`.
- **The board news copy names the President.** That is the President's justifying reader, and it
  ships today while the screen does not.
- **The RNG stream is order-sensitive.** `materialiseStaff` builds one stream and `generateStaff`
  draws coach then N scouts from it. Presence people must draw from their own derived seed
  (`deriveSeed(worldSeed, "presence", clubId)`), or every existing save's backroom changes.
- **The seam is three functions**: `generateStaff` unchanged, a new presence derivation on its own
  seed, and a composing read model. The type splits so the `staff_role` check constraint stays
  honest about what the table holds.
- **Rows link nowhere.** The page is a terminal read-only list, so a derived person needs no
  identity at all.
- **The human Manager is not on the page.** `CONTEXT.md` spent real effort keeping **Manager** off
  the staff concept and this effort does not undo it.
- **Every club at every depth has a President**, `results-only` included. The derivation reads
  Stature Tier, nation, and seed, all of which exist at every depth, so the staff model still has
  no depth branch.

## Decisions so far

<!-- one line per closed ticket: gist, then link to the ticket file -->

- [What a President and a Physio are](issues/01-what-a-president-and-a-physio-are.md): a name and a
  role, nothing else; each person on their own seed so no draw order is load-bearing; domestic names
  because no surface would show a nationality; nothing varies by Stature Tier; `PresenceRole` sits
  beside an unchanged `StaffRole` so the `staff_role` check constraint keeps telling the truth.
- [One function answers who works here](issues/02-one-function-answers-who-works-here.md):
  `deriveClubStaff({ clubId, statureTier, clubNation, worldSeed })` in `rules/staff.ts` composes the
  whole club; the read is a main-process RPC (`getClubStaff`, `ClubStaffView`
  `{ club, groups: [{ department, members }] }`); the bound two are always re-derived, never read
  from the `staff` table, agreeing with the rows by construction.
- [The first club-scoped route](issues/03-the-first-club-scoped-route.md): one closed destination
  `clubStaff` carrying `saveId` + `clubId`, resolving to `/career/$saveId/club/$clubId/staff`; a
  leaf in its own right until a second club screen exists; the league table is the single entry
  point (fixtures and transfers deferred); `g b` real history is Back; registry gains one route,
  keymap and focus coordinator unchanged.
- [What the Club Staff page shows](issues/04-what-the-club-staff-page-shows.md): four department
  groups in fixed order, name and role per row and nothing else, three states
  (`loading`/`ready`/`error`, five dropped on the record), a club header that names the club and
  marks `[Not your club]`, reading order as the design. Prototype
  [here](prototypes/04-club-staff-page.md).
- [The President's voice in board news](issues/05-the-presidents-voice-in-board-news.md):
  `ManagerWarned` and `ManagerSacked` gain the President's name; the Board Objective verdict stays
  institutional; the name is derived in the main process into `NewsClubContext`, never ridden on
  the event; retroactive re-voicing is fine because the name is derived and stable.
- [Screen 38's reconciliation rows](issues/06-screen-38-reconciliation-rows.md): the group C
  ledger ships with screen 38 audited and the other fifteen marked unreconciled; contracts,
  workload, vacancies, responsibilities, search, and the permission model out-of-scope; the
  President/Physio additions recorded as this effort's, not the import's omissions.

## Not yet specified

All three items charting listed as open fog are settled by the tickets above: the shell needs no
viewed-club context beyond the page's own club header (`[Not your club]` marker, ticket 04); the
President does **not** appear in Board Objective copy (the verdict stays institutional, ticket 05);
and the page for a `results-only` club simply lists the four people like any other (no squad is
mentioned, ticket 04). Nothing is left to decide; the map is ready for `/to-spec`.

## Out of scope

Ruled beyond this destination. None of it graduates; each returns only as its own effort.

- **Staff turnover.** Presidents being replaced needs an event, a trigger, and career state to
  store — which would undo the derived-on-read model outright. The first thing to revisit if the
  world feels static.
- **A President number that feeds the Board.** Interesting design, different effort: it changes when
  careers end, the highest-stakes mechanic in the game, and would reopen
  [board objectives and manager sacking](../../.agents/notes/implemented/feature/2026-08-27-board-objectives-and-manager-sacking.md).
- **A staff profile screen** (group D, screens 64-68). Under presence-only there is nothing to show
  that the list row does not already carry.
- **Assistant Manager, Director of Football, and coaching specialisms.** Rejected by name in the
  existing staff note; "the page looked thin" is not an argument against that reasoning.
- **Staff contracts, wages, hiring, firing, vacancies, and responsibilities.** Already cut
  repo-wide; screen 38 asks for all of them and gets none.
- **The rest of the group C ledger** (fifteen other screens) and **the whole of group K**. Each is a
  reconciliation effort in its own right.
- **Growing the name pools.** Ticket 01 established that a page-level name collision runs at roughly
  1 in 400 at today's 20x20 pools and 1 in 20,000 at target size. The curation is already owed by
  [player provenance](../../.agents/notes/implemented/architecture/2026-09-01-player-provenance-and-nationality.md),
  which sized it at ~2,400 entries and called it that decision's honest cost. This effort makes the
  case sharper and still does not own it.
- **Reconciling player naming with staff naming.** Players draw nationality through
  `MIGRATION_LINKS` and can be foreign; no Staff member ever is. Ticket 01 recorded the divergence
  rather than repairing it, because changing the bound staff draw would alter every shipped save's
  backroom. A deliberate non-fix, not an oversight.
