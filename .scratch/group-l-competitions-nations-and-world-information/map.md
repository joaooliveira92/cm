# Map: Group L — Competitions, Nations and World Information

Label: `wayfinder:map`

## Destination

A reconciliation spec and deviation register for screens 161–180 (Competition Overview through World
Football Overview), stating per screen what the implementation must do and what deviations exist
from the imported spec at
`docs/specs/group_l_competitions_nations_and_world_information/`.

## Notes

**Domain**: local single-player football-management sim. CONTEXT.md already models Competition,
League, Fixture, Cup Tie, League Table, Nation, Pyramid, Tier, Season, Calendar, Selection Intent,
Effective Selection, Simulation Depth, and many more. Several screens here overlap with known
implementations (League Table, Fixtures).

**Skills**: `cm-wayfinder` for charting; `grilling` and `domain-modeling` for ambiguous or
conflicting specs; `doc-standards` for any spec/reconciliation writing.

**Precedent**: Group A established the reconciliation pattern — audit each screen against existing
implementation, record deviations (out-of-scope, contradicted, deferred, renamed), write deviation
register, then spec → slice → implement.

**Blocking impact**: Several screens (174 Nation Overview, 175 Nation Competitions) depend on the
Nation/Competition data model already built by active-leagues-setup, world-data-model, etc. The
national team screens (176–178) depend on national team modelling which does not exist yet.

## Decisions so far

- [01 — Screen inventory](issues/01-screen-inventory.md): All 18 screens (161–180) are absent or
  partial WIP placeholders. 11 have routes + 15-line `<h1>` stubs but zero real content; 7 have no
  route at all. The binding constraint is the data layer — `packages/shared`, `packages/contracts`,
  and `packages/game-engine` have no models, RPC schemas, or simulation code for competitions,
  tables, results, statistics, stages, draws, awards, history, records, world rankings, or nation
  football data. Every screen is blocked at the contract layer.

- [02 — v1 scope](issues/02-v1-scope.md): Screens 162–164 (Competition Table, Fixtures, Results)
  and 161 (Competition Overview) are in v1. The national team screens (176–178) and world-ranking
  screens (179–180) are out of scope for v1. The remaining 11 screens are deferred — routes exist
  but data models need building later. Priority: 162 → 163/164 → 161.

- [03 — Competition Table screen](issues/03-competition-table-screen.md): WIP stub replaced with
  real screen. New `getCompetitionTable` RPC (`packages/contracts`), backend handler (`season/`),
  atom (`queries.ts`), and screen component. Standings rendered from existing `computeStandings`
  function via `competitionTableAtom(saveId, competitionId)`. 5 tests cover heading, rows, errors,
  and navigation. New RPC needed a nested `Atom.family` pattern to avoid `MutableHashMap`
  reference-identity issue.

## Not yet specified

- Screen inventory completed (ticket 01). All 18 screens are effectively absent. Next steps:
  - Data model audit: what Competition data already exists vs what needs building
  - v1 scope: which screens are in/out of scope given the data constraints
  - Deviation register: how the imported spec maps to what we'll actually build
- National team modelling (screens 176–178): the codebase has no national team concept, no
  international fixtures, no national team squad management. These may be out-of-scope for v1.

## Out of scope

- **National team management as a playable system.** Screens 176–178 (National Team Overview,
  National Team Squad, International Fixtures and Results) describe surfaces for managing a national
  team, which requires a national team manager career track and international match calendar.
  National teams exist as data (Nations with generated squads, perhaps for view-only reference),
  but managing them is a separate effort (Group O).