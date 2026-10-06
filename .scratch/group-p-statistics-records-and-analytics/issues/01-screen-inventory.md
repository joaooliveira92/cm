# 01: Screen inventory — what of screens 222–235 exists

Type: task
Status: resolved

## Question

Which screens of Group P (222–235) have any existing implementation, stub, route, RPC, schema, or
domain model in the shipped codebase?

Classify each screen as:
- **Shipped** — a route and component exist that match the screen's purpose
- **Partial** — some data exists but no dedicated screen
- **Absent** — no route, no component, no data

Separately answer the data-layer question:
- What match statistics does the game engine produce (the four statistics from the existing match
  model)?
- What accumulated season statistics exist (the `season_summary` read model)?
- Is there any existing analytics, chart, or visualization code in the renderer?

This is a fact-finding ticket. It decides nothing — it exists so the v1 scope decision ticket has
the real facts, not assumptions.

## Answer

**All 14 screens are Absent** — no routes, no components, no RPCs, no DB tables, no shared models.
No Group P screen has any shipped implementation.

**Data-layer findings:**

*Match statistics the engine produces.* The engine emits 9 countable statistics aggregated from the
`MatchEvent` timeline: **goals, attempts, shotsOnTarget, shotsOffTarget, bigChances, yellowCards,
redCards, injuries, substitutions**. These are aggregated per match by `aggregateMatchStatistics` in
`main/match/statistics.ts`. Four statistics are explicitly Unavailable: possession, corners, fouls,
offsides — settled by a prior decision, encoded as `UnavailableMatchStatistic` in the schema.

*Accumulated season statistics.* **None exist.** There is no `season_statistics`,
`competition_statistics`, or `player_statistics` table. The only season-level aggregated data is the
League Table (P/W/D/L/GF/GA/GD/Pts) from fixture scores, frozen in `competitionParticipants`. The
`season_summary` read model covers board objectives and manager outcome only — it is not a statistics
screen.

*Charting/visualization.* **None.** No charting library (recharts, d3, chart.js, etc.) exists in the
lockfile or codebase. All statistics render as plain HTML tables.

*Shipped statistics surfaces.* Match Statistics, Match Report (embeds `MatchStatsView`), Post-Match
Summary, League Table, Competition Table, Competition Results. All are match-level or
competition-table-level — none is a season-wide analytics surface.

See [Research note](../../../docs/research/group-p-statistics-records-analytics.md).