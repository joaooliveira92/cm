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

Nothing beyond *What is already settled* above. This map is the chart, not the answers.

## Not yet specified

Everything below screen level. The three decision tickets are 03, 04 and 05; 05 is blocked on both of
the others, because a disposition table written before the survey and the own-club ruling would be
rewritten by each of them.
