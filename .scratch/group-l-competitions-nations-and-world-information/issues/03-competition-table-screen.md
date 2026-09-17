# 03: Competition Table screen (Screen 162)

**What to build:** Replace the WIP Competition Table stub (`competition/$id/table` →
`CompetitionTableScreen`) with a real screen showing the competition's standings, using the existing
`getLeagueTable` RPC data.

The route exists at `competition/$id/table`. The component is a 15-line `<h1>` placeholder. The
`getLeagueTable` RPC already returns standings for a competition — wire it to this route.

Acceptance:
- The Competition Table screen shows the current standings (position, club, played, won, drawn, lost, goals for, goals against, goal difference, points)
- The data comes from the existing `getLeagueTable` RPC (scoped to the competition in the URL)
- Previous/next round navigation or date context from the spec is deferred; this ticket just shows "current" standings
- The component is styled to match the existing DataTable pattern used by the League Table

**Blocked by:** None (data already exists in `getLeagueTable`)

**Status:** ready-for-agent