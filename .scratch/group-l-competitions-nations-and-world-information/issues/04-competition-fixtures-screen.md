# 04: Competition Fixtures screen (Screen 163)

**What to build:** Replace the WIP Competition Fixtures stub (`competition/$id/fixtures` →
`CompetitionFixturesDetailScreen`) with a real screen showing the competition's fixture list, using
the existing `getFixtures` RPC data scoped to a competition.

The route exists at `competition/$id/fixtures`. The component is a 15-line `<h1>` placeholder. The
`getFixtures` RPC already returns fixtures — add a `getCompetitionFixtures` variant that takes a
`competitionId` parameter, following the same pattern as ticket 03's `getCompetitionTable`.

**Blocked by:** [03 — Competition Table screen](03-competition-table-screen.md)

**Status:** ready-for-agent