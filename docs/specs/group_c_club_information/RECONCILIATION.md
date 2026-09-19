# Group C reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per spec section, every place the import is
knowingly not followed, and why.

It is an index, not a store. A row states the divergence in one line and points at the decision that
carries it. Anything needing more than a line belongs in an Agent Note under
[.agents/notes/](../../../.agents/notes/), with the row's Anchor linking to it.

The import files are never edited. Their value is that you can always see what arrived.

**This ledger covers screen 38 alone.** Groups A and B were reconciled each as its own dedicated
effort; this effort ships the one screen from group C that its design builds, and settles <b>no</b>
other screen in the group. Silence about screens 33-37 and 39-49 below means **unreconciled** — no
one has read them — not "nothing to reconcile". The coverage table is the place where that status
becomes visible.

The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md)
pilots and the [Group B ledger](../group_b_global_navigation_and_inbox/RECONCILIATION.md) adopts
screen by screen. Group C follows the same four kinds and the same row format; the one extension is
that rows below may cite **screens** (tickets in the `club-staff-presence` effort) as the Anchor for
decisions that live in that effort's settled design rather than in a durable note. Those rows must be
repointed to a promoted Agent Note or `CONTEXT.md` term if the design changes.

Because this effort records the settled *design* of screen 38, the rows below describe what will
ship, pending the screen's build. The status line is that of the design, not of shipped code; when
the screen lands, the rows get verified against the thing that actually renders.

## How to read a row

| Field | Meaning |
|---|---|
| Sections | The cited import sections: file, `§N`, and the heading text. Heading text is carried because this import's numbering is not trusted to be stable. |
| Kind | One of the four below. |
| What the spec asks | One line, so the ledger is readable without opening the import. |
| Disposition | What this project does instead, or nothing. |
| Anchor | Meaning set by Kind — the mandatory field that stops an entry being an unsupported assertion. |

### Kinds

| Kind | Meaning | Anchor holds | Can it return? |
|---|---|---|---|
| `out-of-scope` | Ruled permanently outside this game. | The reason. | No. |
| `contradicted` | This codebase already made an incompatible decision. | The Agent Note or `CONTEXT.md` term carrying that decision. | Only if that decision is overturned. |
| `deferred` | Wanted, in scope, not built. | The owning spec group, or `unscheduled`. | Yes. |
| `renamed` | The concept exists here under different vocabulary; behaviour agrees. | The `CONTEXT.md` term. | N/A — this row asserts agreement. |

Sections followed as written get **no row**. What that silence means depends on the screen's status
line:

| Status | What silence asserts |
|---|---|
| `Audited` | Everything not listed below is followed. A section-by-section pass was made. |
| `Reviewed` | Nothing. The rows are the material conflicts a single-session pass found; unlisted sections were not individually checked. |
| `Not yet audited` | Nothing. |

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 33 Club Overview | [33_club_overview.md](33_club_overview.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 34 Club General Information | [34_club_general_information.md](34_club_general_information.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 35 Club Squad | [35_club_squad.md](35_club_squad.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 36 Reserve Squad | [36_reserve_squad.md](36_reserve_squad.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 37 Youth Squad | [37_youth_squad.md](37_youth_squad.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 38 Club Staff | [38_club_staff.md](38_club_staff.md) | Audited — club-staff-presence design, 2026-09-07 |
| 39 Club Finances | [39_club_finances.md](39_club_finances.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 40 Club Fixtures | [40_club_fixtures.md](40_club_fixtures.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 41 Club Results | [41_club_results.md](41_club_results.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 42 Club Transfers | [42_club_transfers.md](42_club_transfers.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 43 Club History | [43_club_history.md](43_club_history.md) | Follows **Group Q** — needs persisted season history; out of M1, confirmed 2026-09-19 |
| 44 Club Records | [44_club_records.md](44_club_records.md) | Follows **Group Q** — needs persisted season history; out of M1, confirmed 2026-09-19 |
| 45 Club Honours | [45_club_honours.md](45_club_honours.md) | Follows **Group Q** — needs persisted season history; out of M1, confirmed 2026-09-19 |
| 46 Club Information and Facilities | [46_club_information_and_facilities.md](46_club_information_and_facilities.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 47 Supporter and Board Confidence | [47_supporter_and_board_confidence.md](47_supporter_and_board_confidence.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 48 Club Comparison | [48_club_comparison.md](48_club_comparison.md) | Reviewed — disposed, group-c ticket 05, 2026-09-19 |
| 49 Team Scout Report | [49_team_scout_report.md](49_team_scout_report.md) | **Shipped** — `team-scout-report` effort, closed 2026-09-09; row corrected 2026-09-19 |

## Screens 33–37, 39–42, 46–48: the remainder

Status: **Reviewed** (group-c ticket 05, 2026-09-19). These are **whole-screen dispositions, not
section-by-section audits**: the effort ruled on files, so each row cites a whole file and the
`Reviewed` status means what the table above says it means — unlisted sections were not individually
checked.

Two decisions carry every row below, and neither is re-argued per screen:

- **[A club screen is club-scoped unless only your club has one](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md)**
  (ticket 04). One screen per subject, club-scoped; a nav entry is a thin own-club resolver. The
  exception is subject existence, not visibility — `CONTEXT.md` states that a Club carries no hidden
  value of its own, so there is no club-level fog for a second screen to model.
- **[A v1 exclusion is `deferred`](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md)**
  and [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md).
  **No row here is `out-of-scope`**, and that is a finding rather than an oversight: not one of the
  twelve is ruled out by a statement that the thing should not exist in this game. They are missing
  models and a version boundary, and both of those come back.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [33_club_overview.md](33_club_overview.md), whole file | `deferred` | A club's landing dashboard: competitive position, next fixture, recent form, squad availability, finances, board objectives, facilities and alerts in one permission-aware page. | Not built, and it cannot precede its parts — it composes 34–48 and has no model of its own. It has never had a placeholder. Worth building **after** the screens it summarises, not before. | `unscheduled`, gated on the rest of this group. The permission-aware half is empty: one manager, no viewer-knowledge model at club level. |
| [34_club_general_information.md](34_club_general_information.md), whole file | `deferred` | A club's identity and standing: name, nation, ground, reputation, ownership and the rest of its descriptive record. | Not built. The model is partly there — **Stature Tier**, and `stadium_name` / `stadium_capacity` on `clubs` — so this is buildable now, and is M1 step 3's. **It has two placeholders, `clubInfo/` and `clubInformation/`, both labelled "Club Information".** Ticket 04 collapses them to one club-scoped screen. | M1 step 3; [the club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md). |
| [35_club_squad.md](35_club_squad.md), whole file | `renamed` | A club's playing squad with per-player detail. | The concept exists and ships: `squad/` for the manager's own club, interactive. What is missing is the **any-club** view, which is the same screen with its affordances gated — a capability difference, not a second screen. | **Squad** in [CONTEXT.md](../../../CONTEXT.md); the club-scoped rule. |
| [36_reserve_squad.md](36_reserve_squad.md), whole file | `deferred` | A reserve squad, its fixtures and player promotion between it and the first team. | Does not exist. **`CONTEXT.md:774`: "Youth integration and youth promotion are cut from v1: no youth or reserve squad exists."** A note for the unwary — `competitions.kind` admits `"reserve"`, so reserve *Competitions* exist while reserve *squads* do not, and a grep finds the wrong one first. | `v1 exclusion — CONTEXT.md:774`. |
| [37_youth_squad.md](37_youth_squad.md), whole file | `deferred` | A youth squad, youth intake and promotion to the senior squad. | Does not exist, by the same sentence. | `v1 exclusion — CONTEXT.md:774`. |
| [39_club_finances.md](39_club_finances.md), whole file | `deferred` | A club's financial position: balance, income and expenditure, wage bill, transfer spend and projections. | Not built as a club screen. **Transfer Budget** and **Wage Budget** are modelled — `club_budgets`, one row per club — and `budgetReview/` ships for the own club. Income, expenditure and projections have no model. **Two placeholders, `finances/` and `clubFinancesDetail/`**, collapsed by ticket 04 to one club-scoped screen. | M1 step 3 for the budget half; `unscheduled` for income and expenditure, which have no model at all. |
| [40_club_fixtures.md](40_club_fixtures.md), whole file | `renamed` | A club's forthcoming fixtures by competition. | The concept exists and ships as `fixtures/` for the own club. The any-club view is the same screen under the club-scoped rule. | **Fixture** in [CONTEXT.md](../../../CONTEXT.md); the club-scoped rule. |
| [41_club_results.md](41_club_results.md), whole file | `deferred` | Completed matches with score, venue, competition, **attendance**, **player of the match**, tactical summary, and links to reports and statistics. | Partly satisfiable: a Fixture carries its result, and `fixtures/` and `seasonSummary/` show played matches. **Attendance and player-of-the-match have no model** — neither word appears in `schema.ts` or `CONTEXT.md`. It has never had a placeholder. | `unscheduled` for the two missing fields; the played-match half follows Screen 40's treatment. |
| [42_club_transfers.md](42_club_transfers.md), whole file | `renamed` | A club's transfer activity, in and out. | The concept exists and ships as `transferHistory/` for the own club. The any-club view is the same screen under the club-scoped rule. | **Transfer**, **Bid** in [CONTEXT.md](../../../CONTEXT.md); the club-scoped rule. |
| [46_club_information_and_facilities.md](46_club_information_and_facilities.md), whole file | `deferred` | Stadium, training ground, youth development, recruitment reach, medical infrastructure, facility ownership, expansions, relocations and planned improvements. | Almost none of it exists. A club has `stadium_name` and `stadium_capacity` and **deliberately no stadium entity** — the schema says a table "would buy ground-sharing and" more than this game wants. `facilit` appears nowhere in `schema.ts` or `CONTEXT.md`; training ground, medical and recruitment infrastructure are unmodelled. The ground half folds into Screen 34. | `unscheduled`. Not `out-of-scope`: nothing states facilities should never exist, and the stadium comment rules out a *table*, not the concept. |
| [47_supporter_and_board_confidence.md](47_supporter_and_board_confidence.md), whole file | `deferred` | Supporter sentiment and board confidence, with their drivers and trends. | Half has a model and half has none. **Board Objective** is modelled — `board_objective`, `board_objective_verdict` — but **supporter confidence is not**; `supporter` and `attendance` appear nowhere. **This screen stays save-scoped and must never acquire a `club/$clubId/` route**: `board_objective` is keyed on `season_number` and names the human's club, so a rival club has no Board Objective at all. That is ticket 04's one exception, and it is subject existence rather than secrecy. | M1 step 3 for the board half; `unscheduled` for supporters. [The club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md) for why it is save-scoped. |
| [48_club_comparison.md](48_club_comparison.md), whole file | `deferred` | Two or more clubs compared across competition level, reputation, finances, squad profile, facilities, supporters and honours, on normalised measures. | No comparison mechanism exists, and several of the axes it would compare (facilities, supporters, honours) have no model either. It has never had a placeholder. Matches **Group D Screen 63 Player Comparison**, re-kinded `deferred` on the same reasoning 2026-09-19. | `unscheduled`. Same kind and same reason as Group D 63. |

### What these rows owe

- **Build tickets** for the screens M1 step 3 can actually reach — 34, 35, 39 (budget half), 40, 42,
  and 47's board half. Filed as group-c tickets 06–08.
- **The placeholder cull** for `clubInfo/` and `finances/`, which ticket 04 collapses away, and for
  `clubReservesDetail/` and `clubYouthDetail/`, whose screens are `deferred` behind a version
  boundary. That is M1 step 5; filed as group-c ticket 09. Group D owed exactly this ticket and never
  filed it, and the debt sat in its ledger for five days — hence filing it with the dispositions
  rather than after them.

## Screen 38: Club Staff

Status: **Audited** (design — club-staff-presence effort, ticket 06, 2026-09-07).

The screen the import describes is a contract-holding, filterable staff bureau: 24 people, per-staff
profiles and contracts, workload and availability, vacancies, responsibilities, search, and a
permission model over private staff data. This game's screen is the inverse of that by design. The
staff model here closed the role set at four and cut contracts, wages, hiring, firing, and vacancies
repo-wide. What survives is a read-only list of four named people grouped by department — the sheet
ticket 04 settles against its
[prototype](../../../.scratch/club-staff-presence/prototypes/04-club-staff-page.md) — reached as the
first club-scoped route (`club/$clubId/staff`, ticket 03), where the bound Coach and Scouts are
*re-derived* rather than read from the `staff` rows (ticket 02).

**This screen adds things the import never asked for.** The import has no President and no Executive
person at all — its layout shows an Assistant Manager where an Executive department would be. This
design ships a President and a Physio as presence people at *every* club, and a Coach and its four
Scouts at every club too, `results-only` included, none of which is what "24 staff with contracts"
describes. Those are additions of the
[presence staff note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md),
not omissions from the import, and they are the reason the divergent rows below exist.

The design this screen is built to is not the import. It is
[Staff are two bound roles on the human's club](../../../.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md)
and [Presence Staff are derived, never stored](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md),
which between them fix the role set, the person shape, and the read model; the tickets above fix the
route, the wire format, and the states.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1 Purpose | `contradicted` | A staff bureau: managerial, coaching, recruitment, medical, executive, and support personnel with roles, contracts, workload, vacancies, and permitted staffing actions. | Exactly four named people (President, Coach, Scouts, Physio) in four departments. No contracts, workload, vacancies, or actions. | [Staff are two bound roles](../../../.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md)
cut contracts, wages, hiring, and vacancies repo-wide; the role set is closed at four by the same note and [presence staff](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md). |
| §2 Primary user goals, §6 Principal interactions | `out-of-scope` | Filter by department and role; open staff profiles, contracts, history, and responsibilities; assign responsibilities and coaching categories; renew, terminate, or offer contracts; staff search and vacancy views. | None of it. The page is a read-only list that links nowhere; there is nothing to open, assign, search, or offer. | The page is a terminal list (the [presence staff note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md) plus ticket 04); contracts and the hiring market are cut by the staff article. |
| §3 Navigation context (shell → Club → Club Staff) | `renamed` | The screen is reached through the shell's Club subtree. | It is the app's first club-scoped route, `/career/$saveId/club/$clubId/staff`. | ticket 03 — Club Staff is the leaf that introduces the reusable `club/$clubId` segment. |
| §3 Navigation context (viewed club independent of controlled club; actions read-only or absent when viewing another club) | `renamed` | The viewed club stays independent of the manager's club; another club's view is read-only. | The route carries any `$clubId`; the header names the club and marks `[Not your club]`; the page has no actions anywhere, for any club. | [Presence Staff](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md) makes every club's staff derivable; ticket 04 settles the whose-club marker. |
| §4 Conceptual layout | `contradicted` | `NORTH UNITED > STAFF` with 24 staff rows, department filter tabs, Name/Role/Contract/Workload/Status columns, an action bar (Open Profile, Responsibilities, Offer Contract, Search Staff), and Back. | Four department headings holding one, one, four, and one people, showing name and role only; no tabs, no data columns, no action bar, no Back control. | [Prototype](../../../.scratch/club-staff-presence/prototypes/04-club-staff-page.md); name and role only, per ticket 04 and the person shape fixed by ticket 02. |
| §5 Core data model | `contradicted` | `ClubStaffRow` carrying `roleAssignmentIds`, `contractSummary`, `workloadSummary`, `availabilitySummary`, `knowledgeSummary`, and `permittedActions`. | `ClubStaffView { club, groups: [{ department, members: [{ role, firstName, lastName }] }] }` — a name and a role and nothing else. | Ticket 02's wire shape, inherited from the [presence staff note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md) ("a name and a role, nothing else"). |
| §7 View states | `contradicted` | Eight states: loading, ready, refreshing, empty, filtered_empty, permission_limited, unavailable, error. | Exactly `loading`, `ready`, `error`; the other five are dropped on the record. | Ticket 04's state table — one manager and no permission model, one immutable read with no in-place refresh, no filters, and no club that exists un-derivable. |
| §8 Permissions and knowledge | `out-of-scope` | Private budgets, contracts, scouting, relationships, board confidence, and tactical information require explicit permission; viewer knowledge limits what is shown; unknown stays unknown. | Nothing on the page is private: four public persons with no numbers, no per-viewer knowledge, no unknown to preserve. | One human manager per Save renders the viewer-knowledge model empty (see [CONTEXT.md](../../../CONTEXT.md)); presence people carry no number for permission to gate. |
| §9 Sorting, filtering, and search | `out-of-scope` | Stable entity IDs and deterministic tie-breakers; filters change visibility only; locale-aware debounced cancellable search; virtualized large lists. | Four rows in a fixed department order, no filters, no search, nothing to virtualize. | Template scaffolding, the same row Groups A and B carry (see [Group B §15](../group_b_global_navigation_and_inbox/RECONCILIATION.md)); ticket 04 fixes the order. |
| §10 Empty and error states | `contradicted` | Distinguish no data, no filter matches, unavailable entity, permission denied, offline authority, stale revision, and operational failure; preserve the last valid view during recoverable refresh failure. | The list is never empty and never refreshed in place; the only failure is the read itself, rendered as `error`, including an unknown club. | Ticket 04's states; single-writer local persistence rules out stale revision and offline authority (the Decider premise from [Domain-bounded Deciders](../../../.agents/notes/implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md)). |
| §11 Accessibility (headings, list/grid semantics, keyboard-only, no status by color alone, visible focus) | `renamed` | Persistent headings, data as accessible lists or grids, keyboard-only use, visible focus. | The reading order and region labelling *are* the page's design: `<main>` labelled by the club heading, four `<h2>` groups, rows in DOM order. | Ticket 04; the keyboard-first screen standards this repo already applies to every screen. |
| §11 Accessibility (dynamic announcements, focus restore after dialogs), §12 Localization, §13 Responsive behavior | `deferred` | Announce meaningful updates; restore focus after linked views and dialogs; localized labels and plural forms; RTL; 200 percent scaling; wide/shrunk/ultrawide layouts. | No live updates to announce and no dialogs to restore from; no i18n layer exists; the window is fixed-size and nothing degrades. | `unscheduled` — the same rows Groups A and B carry (localization, responsive behavior); the announcement and focus-restore rows have no second surface to refer to. |
| §14 Performance | `renamed` | Query compact read models instead of complete world graphs. | One `getClubStaff` RPC returns the whole page — the derivation with tier and nation read at the main-process boundary. | Ticket 02's read path — deriving is the cheap-to-read model the note's risk section endorses. |
| §14 Performance (virtualization, debounced search, cancellation, revision-fingerprint caching) | `out-of-scope` | Virtualize long lists; debounce and cancel search; cache derived data with full revision fingerprints; keep heavy aggregation off the renderer. | Four rows, no search, one immutable read with nothing to cache or cancel. | Template scaffolding, same as Group B §15. |
| §15 Security and integrity (validate route parameters in a trusted layer) | `renamed` | Validate route parameters, stable IDs, filters, revisions, and actions in a trusted layer. | The renderer validates nothing; the RPC validates `$clubId` against the save and returns `ClubNotFoundError`. | Ticket 03 — an unknown club is a typed RPC failure rendered by the screen, never a redirect. |
| §15 Security and integrity (the rest) | `out-of-scope` | Treat text as untrusted; enforce permissions host-side; idempotency keys and expected revisions; money with explicit currency; sanitized diagnostics; reject inactive contexts. | The page renders four trusted derived strings and issues no command, so there are no mutations, no money, no permissions, and no inactive context to reject. | The page links nowhere and mutates nothing (ticket 04); renderer strings come from the save's own derivation, not from user text. |
| §16 Screen-specific rules | `out-of-scope` | Employment role, coaching assignment, and responsibility delegation are distinct; private staff attributes obey viewer knowledge; contract actions require budget and authority; vacancies must not be fake records. | None land: there are no responsibilities to delegate, no private attributes, no contracts, and deliberately no vacancies at all. | The closed four-role set ([staff article](../../../.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md)); "no fake vacancies" is moot when the concept itself is cut. |
| §17 Persistence | `out-of-scope` | Persist safe view preferences, manager-scoped filters, column selections, and authorized drafts. | Nothing on the page is persisted and nothing is preferences-shaped; it is a pure read. | Presence people are "never stored" by the note; the page fixes no view state (ticket 04). |
| §18 Observability | `out-of-scope` | Record query duration, result category, revision conflicts, and safe error codes; avoid private data in telemetry. | No telemetry leaves the device. | Same axis as Groups A and B — the app has no backend, no consent surface, no privacy policy. |
| §19 Edge cases | `out-of-scope` | Club changes competition mid-transition; selected entity becomes unavailable; manager changes; permissions change; revision advances; filter hides selection; duplicate mutation; host disconnects. | The only surviving case — the viewed club is not in this save, or the save is missing — is the `error` state. Selections, revisions, mutations, and the network have no referent. | Same dispositions as Group B §19 (single writer, no network); ticket 04's `error` state. |
| §20 Acceptance criteria | `contradicted` | Criteria 1-4 (roles distinct, private attributes, contract authority, no fake vacancies), 5 (state distinctions), 6 (stable IDs and revisions), 7 (keyboard/AT), 8 (no proprietary assets). | Criteria 1-4 and 6 are out-of-scope as above; criterion 5 collapses to three states; criterion 7 lands via this repo's screen standards; criterion 8 is a clean-room task already satisfied. | Tickets 04, 03; the staff article; the repo's screen standards. |
| §21 Recommended tests | `out-of-scope` | Authorized view, read-only other club, permission-limited, stale async, deleted entity, large virtualized set, keyboard navigation, screen-reader, high scaling, RTL. | The read-only-other-club, keyboard, and screen-reader cases go into the screen's test plan at build; the permission/async/virtualization/scaling/RTL cases go with their dispositions above. | Tickets 04 (states) and 03 (route); build-time test plan. |
| §22 Condensed LLM implementation brief, §23 Suggested Git commit | `out-of-scope` | A prose restatement of the whole file and a suggested commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — an artifact of how the import was generated, not a requirement. |