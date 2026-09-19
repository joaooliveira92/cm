# Map: Group C — Club Information (the remainder)

Label: `wayfinder:map`

## Destination

Every Group C screen disposed or built, with no row in
[RECONCILIATION.md](../../docs/specs/group_c_club_information/RECONCILIATION.md) reading
`Not yet audited`. That is milestone [M1](../../.ai/MILESTONES.md) **step 3**, and exit criterion 2
names it directly.

## What is already settled

- **Screen 38 Club Staff — shipped.** `club-staff-presence`, audited 2026-09-07. Its ledger rows are
  complete and are not reopened. Its Club-section nav entry now reaches it through an own-club
  resolver ([ticket 02](issues/02-the-club-staff-nav-entry-lands-on-a-placeholder.md)).
- **Screen 49 Team Scout Report — shipped, and the ledger does not say so.** The `team-scout-report`
  effort closed with all eight tickets resolved and the screen lives at
  `renderer/scouting/TeamScoutReportScreen.tsx`, routed club-scoped as `teamScoutReport`. Its
  coverage row still reads `Not yet audited`. **This is a stale row, not unaudited work**, and
  correcting it is part of ticket 03 rather than a screen to dispose.
- **Screens 43–45 History, Records, Honours — out of this milestone.** Confirmed 2026-09-19: they
  need persisted season history and follow **Group Q** rather than carving a history store inside
  M1. The same gap holds Group D 55 and Group L 172–173, so the store is one piece of work serving
  six screens across three groups. Do not dispose them here; record the anchor and move on.

That leaves **twelve** screens — 33–37, 39–42, 46–48 — which is exactly what M1 step 3 names.

## Notes

**Domain**: local single-player football-management sim. Glossary terms this group touches:
**Club**, **Stature Tier**, **Simulation Depth**, **Transfer Budget**, **Wage Budget**, **Board
Objective**, **Competition**, **Fixture**, **Squad**, **Staff**. Read CONTEXT.md before ruling that a
screen has no model — several of these exist under a different word.

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards`
for anything under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** All seventeen files are the same generated template.
Treat them as a reconciliation checklist, exactly as Groups A and D did.

**Standing decisions inherited from Group A**: the multiplayer/multi-manager axis is out of scope;
worker pools and memory budgets are out of scope; off-device telemetry is out of scope; non-normative
import scaffolding is disposed.

## Fog

### The one that shapes everything else: own club, or any club?

The renderer already carries **two parallel families** of club screen, and the import has no opinion
about the difference because it was written for a game with one.

- **Save-scoped nav destinations**, reached from the Club section with only a `saveId`:
  `clubInfo`, `finances`, `boardConfidence`, `clubHistory`, and `clubs` (a browse list).
- **Club-scoped drill-downs** at `club/$clubId/…`, reached from a surface that already names a club:
  `clubInformation`, `clubFinancesDetail`, `clubHistoryDetail`, `clubSquadDetail`,
  `clubReservesDetail`, `clubYouthDetail`, `clubFixturesDetail`, `clubTransfersDetail`,
  `clubCompetitionsDetail`.

Several import screens therefore have **two placeholders**, not one — `clubInfo` and
`clubInformation` are both Screen 34's; `finances` and `clubFinancesDetail` are both Screen 39's.
Whether that is one screen or two is the question the whole group turns on, and answering it twelve
times independently is how a codebase ends up with twelve inconsistent answers.

**There is already a precedent, and it points one way.** Screen 38 exists **once**, club-scoped, and
its nav entry is a thin own-club resolver over the same screen
([ticket 02](issues/02-the-club-staff-nav-entry-lands-on-a-placeholder.md)). `destinations.ts`
records why: a drill-down needs a target club and so cannot be a save-scoped nav destination, and
`squadAtom(saveId).club.id` is the established own-club resolution. Ticket 04 should test that
precedent rather than assume it — it was set by one screen whose content happens not to differ
between my club and theirs, and Finances plausibly does differ.

### What actually has a model

Ruling on twelve screens without knowing which have data behind them is how Group D's summary came to
miscount its own dispositions. The survey comes first, and it is ticket 03.

Known or strongly suspected:

- **35 Club Squad** — the Squad screen is shipped for the own club; `clubSquadDetail` is the any-club
  version. Likely `renamed`, pending ticket 04.
- **36 Reserve Squad, 37 Youth Squad** — no reserve or youth squad model is known to exist. If none
  does, these are the absence-of-a-model case, which is **`deferred`**, not `out-of-scope`
  ([the rule](../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md)).
  M1 step 1 found this error three times in four; do not make it a fourth.
- **39 Club Finances** — Transfer Budget and Wage Budget are modelled and the Budget Review screen
  ships. Whether that satisfies 39 or is a different screen is a real question.
- **40 Club Fixtures, 41 Club Results** — Fixtures ship for the own club. Any-club versions are the
  same question as 35.
- **42 Club Transfers** — Transfer History ships. Same shape again.
- **46 Information and Facilities** — Stature Tier exists; facilities do not, as far as is known.
- **47 Supporter and Board Confidence** — Board Objective is modelled; supporter confidence is not
  known to be. The screen may be half-satisfiable, which is its own disposition problem.
- **48 Club Comparison** — Group D disposed Player Comparison (63) for having no comparison
  mechanism, and re-kinded it `deferred` on 2026-09-19. 48 is the same question about clubs and
  should get the same kind for the same reason.

### What the answers cost

M1 step 5 deletes the placeholder of every screen disposed here, and there are roughly fourteen
`club*` WIP screens. A disposition that is wrong is therefore a deleted route, which is recoverable,
and a ledger row that lies, which is the thing M1 exists to end.

## Decisions so far

### Screen inventory ([ticket 03](issues/03-screen-inventory-and-the-stale-49-row.md), 2026-09-19)

Every "none found" below names the search behind it. A model missing from `schema.ts` *and* from
`CONTEXT.md` is recorded as not found; a model that exists under another word is named.

| Screen | Placeholder(s) in `renderer/` | Route(s) | Model behind it | Shipped screen that may satisfy it |
|---|---|---|---|---|
| 33 Club Overview | none | — | A dashboard over every other Group C subject. Has no model of its own; it is a composition of theirs. | None. Its content is whatever 34–48 resolve to. |
| 34 Club General Information | **`clubInfo/` and `clubInformation/`** — both carry `aria-label="Club Information"` | `club-info` (save-scoped) and `club/$clubId/information` | Club, **Stature Tier**, `stadium_name`, `stadium_capacity` on `clubs` | None |
| 35 Club Squad | `clubSquadDetail/` | `club/$clubId/squad` | Squad, Player, Position Rating — fully modelled | **`squad/`**, shipped and interactive, for the own club |
| 36 Reserve Squad | `clubReservesDetail/` | `club/$clubId/reserves` | **None — and ruled.** `CONTEXT.md:774` "no youth or reserve squad exists", cut from v1. Note `competitions.kind` admits `"reserve"`, so reserve *Competitions* exist while reserve *squads* do not. | None |
| 37 Youth Squad | `clubYouthDetail/` | `club/$clubId/youth` | **None — and ruled.** Same sentence, `CONTEXT.md:774`. | None |
| 39 Club Finances | **`finances/` and `clubFinancesDetail/`** | `finances` (save-scoped) and `club/$clubId/finances` | **Transfer Budget**, **Wage Budget** — `club_budgets` carries `transfer_budget_remaining` and `wage_budget` | **`budgetReview/`**, shipped, for the own club |
| 40 Club Fixtures | `clubFixturesDetail/` | `club/$clubId/fixtures` | Fixture, Competition — fully modelled | **`fixtures/`**, shipped, for the own club |
| 41 Club Results | none | — | Fixture carries its result. **Attendance and player-of-the-match: none found** (absent from `schema.ts` and `CONTEXT.md`). | `fixtures/` and `seasonSummary/` may cover the played half |
| 42 Club Transfers | `clubTransfersDetail/` | `club/$clubId/transfers` | Transfer, Bid — modelled | **`transferHistory/`**, shipped, for the own club |
| 46 Information and Facilities | none of its own | — | `stadium_name` and `stadium_capacity` exist on `clubs`, deliberately without a stadium entity. **Training ground, medical, recruitment reach, expansions: none found** (`facilit` appears nowhere in `schema.ts` or `CONTEXT.md`). | None |
| 47 Supporter and Board Confidence | `boardConfidence/` | `board-confidence` (save-scoped) | **Board Objective** is modelled — `board_objective`, `board_objective_verdict`. **Supporter confidence: none found** (`supporter`, `attendance` appear nowhere). | None |
| 48 Club Comparison | none | — | **None found.** No comparison mechanism, matching Group D 63 Player Comparison. | None |

**Two screens have two placeholders each** — 34 and 39 — which is ticket 04's subject, now with
names rather than a suspicion. Three screens (33, 41, 48) have **no** placeholder and never did;
their absence is itself a finding, since M1 step 5 has nothing to cull for them.

### Corrections to the coverage table

- **Screen 49 Team Scout Report is shipped, and its row said `Not yet audited`.** Verified against
  the tree, not the ticket: `renderer/scouting/TeamScoutReportScreen.tsx` exists and is routed
  club-scoped as `teamScoutReport` in `router/index.tsx`. The `team-scout-report` effort closed with
  all eight tickets `resolved`.
- **Screens 43–45 follow Group Q**, confirmed 2026-09-19. Their rows say so rather than leaving a
  reader to re-derive it.

### The kind 36 and 37 take, decided here because the evidence is unambiguous

`CONTEXT.md:774` — "Youth integration and youth promotion are cut from v1: no youth or reserve squad
exists" — is a **version boundary**, and
[a v1 exclusion is `deferred`](../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md)
rules that those are `deferred`, anchored `v1 exclusion — CONTEXT.md:774`. Not `out-of-scope`: that
kind is reserved for a positive statement that the thing should not exist, and "cut from v1" is not
one. The map flagged 36 and 37 as shaped to attract this error; the evidence says the flag was right.

46 and 48 are the absence-of-a-model case and take `deferred` too, but ticket 05 owns their anchors.

### The own-club rule ([ticket 04](issues/04-one-screen-per-subject-or-two.md), 2026-09-19)

**A Group C screen is club-scoped and exists once; a nav entry is a thin own-club resolver over it.
The exception is subject existence, not visibility.**
[Note](../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).

The information axis the fog worried about turned out to be empty. `CONTEXT.md`: *a Club never
carries a hidden value of its own for an Attribute Range to narrow* — uncertainty lives at the
Player level, and there is no club-level fog mechanism, so visibility can never be the
discriminator.

What decides it is whether a rival club has a row. `club_budgets` is keyed on `club_id`, so Screen
39 is club-scoped; `board_objective` is keyed on `season_number` and names the human's club, so a
rival has no Board Objective at all and Screen 47 is save-scoped. **Screens 34 and 39 collapse to
one screen each** — `clubInfo/` and `finances/` go, `clubInformation/` and `clubFinancesDetail/`
stay.

An interactive own-club screen is not a second screen: that is a capability difference the resolver
handles, and building two is how Screen 34's pair came to exist.

### The dispositions ([ticket 05](issues/05-dispose-the-twelve.md), 2026-09-19)

All twelve disposed. **No coverage row reads `Not yet audited`** — M1 exit criterion 2 met for
Group C. Nine `deferred`, three `renamed`, and **none `out-of-scope`**: not one of the twelve is
ruled out by a statement that the thing should not exist, which is the opposite of Group D's staff
screens. Two screens are half-modelled (39, 47) and their halves are named separately, or the build
ticket would invent the missing one.

## Not yet specified

The chart is complete; what remains is building. Tickets 06, 07 and 08 are the buildable screens —
34, then 35/40/42, then the modelled halves of 39 and 47 — and 09 is the placeholder cull, blocked on
all three because each absorbs placeholders 09 would otherwise delete out from under them.
