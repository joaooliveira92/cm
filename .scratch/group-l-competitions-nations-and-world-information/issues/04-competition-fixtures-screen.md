# 04: Competition Fixtures screen (Screen 163)

**What to build:** Replace the WIP Competition Fixtures stub (`competition/$id/fixtures` →
`CompetitionFixturesDetailScreen`) with a real screen showing the competition's fixture list, using
the existing `getFixtures` RPC data scoped to a competition.

The route exists at `competition/$id/fixtures`. The component is a 15-line `<h1>` placeholder. The
`getFixtures` RPC already returns fixtures — add a `getCompetitionFixtures` variant that takes a
`competitionId` parameter, following the same pattern as ticket 03's `getCompetitionTable`.

Acceptance:

- [x] The Competition Fixtures screen lists the competition's fixtures (date, home club, away club, and score or unplayed state)
- [x] The data comes from a new `getCompetitionFixtures` RPC scoped to the competition in the URL, declared in `packages/contracts` with schemas on request and response
- [x] Played and unplayed fixtures are visually distinct; an unplayed fixture shows no fabricated score
- [x] Loading and error states are handled, matching `CompetitionTableScreen`'s treatment
- [x] The component follows the existing DataTable pattern used by `CompetitionTableScreen`
- [x] Filters, round/stage navigation, export, and calendar-period navigation from the imported
      spec are deferred; this ticket lists the current edition's fixtures only
- [x] Tests cover the heading, fixture rows, the played/unplayed distinction, and the error state

**Blocked by:** [03 — Competition Table screen](03-competition-table-screen.md)

## Orchestrator ratification

The seven acceptance criteria were written by the orchestrator before dispatch, against ticket 03's
shipped shape and the v1 scope of [02 — v1 scope](02-v1-scope.md) — not by the implementation
describing itself. Criterion 6's deferral (filters, round/stage navigation, export, calendar-period
navigation) is the same reduction ticket 03 applied to Screen 162 and is ratified here on that
precedent; the deferred surface is recorded in [05](05-competition-read-followups.md) rather than
closed by a checkbox.

Criterion 1 originally read "scheduled state". CONTEXT.md lists **Schedule** as an _Avoid_ term, so
the criterion was wrong and the implementation's "Unplayed" was right; the wording is corrected above.

**Status:** resolved
