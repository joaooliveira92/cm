# Competition contextual placeholders

Type: task
Status: resolved
Blocked by: 01

## Question

After Batch 1, create skeleton placeholder screens for competition entities at `/career/$saveId/competition/$competitionId/...`.

Sub-screens from CM 03/04 IA:
- Overview, Table, Fixtures, Results, Stages, Rules, Statistics, Past Winners, Records, News, Teams, Player Stats

## Answer

**12 competition sub-screen routes created** (overview, table, fixtures, results, stages, rules, statistics, past-winners, records, news, teams, player-stats) under `/career/$saveId/competition/$competitionId/...` with `CareerCompetitionChildView`. CompetitionId already exists in contracts. See main [Agent Note](../../../.agents/notes/proposed/feature/2026-09-11-career-scoped-placeholder-screens.md).