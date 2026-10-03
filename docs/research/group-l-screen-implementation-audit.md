# Group L: Implementation Audit — Screens 161–180

## Question

Which of Screens 161–180 (Competitions, Nations and World Information) already have implementations in the codebase, and at what depth?

## Sources

- **Route tree**: `apps/desktop/src/renderer/router/index.tsx` (verified directly)
- **Navigation destinations**: `apps/desktop/src/renderer/navigation/destinations.ts` (verified directly)
- **Screen components**: `apps/desktop/src/renderer/*/...Screen.tsx` (verified directly)
- **Spec files**: `docs/specs/group_l_competitions_nations_and_world_information/<NN>-*.md` (read each)
- **Group L index**: `docs/specs/group_l_competitions_nations_and_world_information/00_group_l_index.md`
- **RPC contracts**: `packages/contracts/src/rpc.ts` and `packages/contracts/src/schemas/` (verified directly)

## Findings

### Key structural facts

1. **All existing competition and nation screen components are WIP placeholders.** Every screen inspected shows exactly `<h1>Title</h1>`, `<p>Competition/Nation {id}</p>`, and `<p>WIP — Placeholder screen</p>` — 15 lines, no data fetching, no RPC calls, no real content.

2. **The competition route tree** lives at `/career/$saveId/competition/$competitionId/` and currently has 13 child routes (overview, table, fixtures, results, stages, rules, statistics, past-winners, records, news, teams, player-stats). The route file (index.tsx:598–674) also registers `CompetitionFixturesDetailScreen`, `CompetitionPastWinnersScreen`, and `CompetitionNewsScreen` which are not in Group L.

3. **The nation route tree** lives at `/career/$saveId/nation/$nationId/` and has 10 child routes (overview, senior-squad, youth-squads, fixtures, competitions, clubs, players, staff, history, information). Several of these are not in Group L.

4. **No world-level routes exist.** There is no `/career/$saveId/world/` or flat `/career/$saveId/` route for "World Rankings" or "World Football Overview".

5. **No RPC methods** specific to competition data or world information were found in `packages/contracts/src/rpc.ts`. The existing RPC layer handles save-game lifecycle, club queries, player queries, and match events — no competition-standing, ranking, or world-information queries.

### Screen-by-screen audit

| # | Name | Route exists? | Component exists? | Classification | Notes |
|---|---|---|---|---|---|
| 161 | Competition Overview | Yes: `competition/$id/overview` | Yes: `CompetitionOverviewScreen` | **Partial** | 15-line WIP stub, no data |
| 162 | Competition Table | Yes: `competition/$id/table` | Yes: `CompetitionTableScreen` | **Partial** | 15-line WIP stub, no data |
| 163 | Competition Fixtures | Yes: `competition/$id/fixtures` | Yes: `CompetitionFixturesDetailScreen` | **Partial** | 15-line WIP stub, no data |
| 164 | Competition Results | Yes: `competition/$id/results` | Yes: `CompetitionResultsScreen` | **Partial** | 15-line WIP stub, no data |
| 165 | Competition Statistics | Yes: `competition/$id/statistics` | Yes: `CompetitionStatisticsScreen` | **Partial** | 15-line WIP stub, no data |
| 166 | Competition Player Statistics | Yes: `competition/$id/player-stats` | Yes: `CompetitionPlayerStatsScreen` | **Partial** | 15-line WIP stub, no data |
| 167 | Competition Team Statistics | Ambiguous | Ambiguous | **Absent** | Route named `competition/$id/teams` maps to `CompetitionTeamsScreen` (WIP). This may have been intended for 167, but the route name "teams" suggests a participating-clubs list, not team performance statistics. The spec requires per-club metrics (possession, discipline, form, home/away splits) — no implementation exists. |
| 168 | Competition Rules | Yes: `competition/$id/rules` | Yes: `CompetitionRulesScreen` | **Partial** | 15-line WIP stub, no data |
| 169 | Competition Stages and Qualification | Yes: `competition/$id/stages` | Yes: `CompetitionStagesScreen` | **Partial** | 15-line WIP stub, no data |
| 170 | Competition Draw | No | No | **Absent** | No route, no component. Would need RPC for deterministic auditable random draw execution. |
| 171 | Competition Awards | No | No | **Absent** | No route, no component. `CompetitionPastWinnersScreen` (at `competition/$id/past-winners`) exists but covers only past champions/runners-up, not the full awards spec (monthly, seasonal, player/manager awards, etc.). |
| 172 | Competition History | No | No | **Absent** | No route, no component. The `CompetitionPastWinnersScreen` covers only past winners — not format changes, notable events, or historical participants per spec. |
| 173 | Competition Records | Yes: `competition/$id/records` | Yes: `CompetitionRecordsScreen` | **Partial** | 15-line WIP stub, no data |
| 174 | Nation Overview | Yes: `nation/$id/overview` | Yes: `NationOverviewScreen` | **Partial** | 15-line WIP stub, no data |
| 175 | Nation Competitions | Yes: `nation/$id/competitions` | Yes: `NationCompetitionsDetailScreen` | **Partial** | 15-line WIP stub, no data |
| 176 | National Team Overview | No | No | **Absent** | No dedicated route. `NationSeniorSquadScreen` exists but is a squad (player list) view, not a national team overview with manager, ranking, fixtures, form, qualification status. |
| 177 | National Team Squad | No | No | **Absent** | No dedicated route. `NationSeniorSquadScreen` exists but is a static stub. The spec requires call-up management, standby lists, eligibility, release conflicts, and squad submission — none implemented. `NationYouthSquadsScreen` is for youth teams only. |
| 178 | International Fixtures and Results | Yes: `nation/$id/fixtures` | Yes: `NationFixturesScreen` | **Partial** | 15-line WIP stub, no data. Route named "Nation Fixtures" could serve this screen but is scoped to a single nation (not world-wide international fixtures). |
| 179 | World Rankings | No | No | **Absent** | No route, no component. Would need RPC for snapshot-based ranking data. |
| 180 | World Football Overview | No | No | **Absent** | No route, no component. Would be the global landing page — no world-scoped routes exist at all. |

### What actually exists in the renderer

The following component folders and files exist. **Every one** is a 15-line WIP placeholder with no real content:

```
apps/desktop/src/renderer/competitionOverview/CompetitionOverviewScreen.tsx
apps/desktop/src/renderer/competitionTable/CompetitionTableScreen.tsx
apps/desktop/src/renderer/competitionFixturesDetail/CompetitionFixturesDetailScreen.tsx
apps/desktop/src/renderer/competitionResults/CompetitionResultsScreen.tsx
apps/desktop/src/renderer/competitionStatistics/CompetitionStatisticsScreen.tsx
apps/desktop/src/renderer/competitionPlayerStats/CompetitionPlayerStatsScreen.tsx
apps/desktop/src/renderer/competitionTeams/CompetitionTeamsScreen.tsx
apps/desktop/src/renderer/competitionRules/CompetitionRulesScreen.tsx
apps/desktop/src/renderer/competitionStages/CompetitionStagesScreen.tsx
apps/desktop/src/renderer/competitionPastWinners/CompetitionPastWinnersScreen.tsx
apps/desktop/src/renderer/competitionRecords/CompetitionRecordsScreen.tsx
apps/desktop/src/renderer/competitionNews/CompetitionNewsScreen.tsx
apps/desktop/src/renderer/nationOverview/NationOverviewScreen.tsx
apps/desktop/src/renderer/nationSeniorSquad/NationSeniorSquadScreen.tsx
apps/desktop/src/renderer/nationYouthSquads/NationYouthSquadsScreen.tsx
apps/desktop/src/renderer/nationFixtures/NationFixturesScreen.tsx
apps/desktop/src/renderer/nationCompetitions/NationCompetitionsScreen.tsx
apps/desktop/src/renderer/nationClubs/NationClubsScreen.tsx
apps/desktop/src/renderer/nationPlayers/NationPlayersScreen.tsx
apps/desktop/src/renderer/nationStaff/NationStaffScreen.tsx
apps/desktop/src/renderer/nationHistory/NationHistoryScreen.tsx
apps/desktop/src/renderer/nationInformation/NationInformationScreen.tsx
```

No component exists for: Competition Draw, Competition Awards, Competition History, National Team Overview, National Team Squad, World Rankings, or World Football Overview.

### Data models and contracts

No domain-specific data models exist for these screens. The `packages/shared/src/` has `calendar.ts` and `cupBracket.ts` under `season/` but no `competition/` or `nation/` read models. The `packages/contracts/src/schemas/` has `season.ts`, `clubs.ts`, `match.ts`, `squad.ts`, `players.ts`, etc., but no schemas for:

- Competition standing/table rows
- Competition fixture schedules (at the competition level)
- Competition results
- Competition statistics (per-competition)
- Competition stages/brackets
- Competition draws
- Competition awards
- Competition history/records
- Nation football information
- National team data
- World rankings
- World football overview

**No RPC methods** exist for fetching any of these data types.

## Recommendations

**What an implementator may rely on:**
- All competition sub-routes under `competition/$competitionId/` are registered and navigable
- All nation sub-routes under `nation/$nationId/` are registered and navigable
- The pattern for adding a child view (import screen component, register route, add child to route tree) is well-established in `index.tsx`
- The `CareerCompetitionChildView` and `CareerNationChildView` wrappers handle parameter decoding and focus management

**What remains a design choice (not a research finding):**
- Whether `CompetitionTeamsScreen` (route: `competition/$id/teams`) should become Screen 167 or remain a participating-clubs list with a separate team-stats route
- Whether nation/fixtures should serve both Screen 178 (one nation's international fixtures) and a hypothetical world-wide fixtures view
- Whether CompetitionPastWinnersScreen (at `competition/$id/past-winners`) should be extended to become Screen 171 (awards) or kept separate
- The exact route paths for the seven absent screens

**Recommended priority:** Start with data model and RPC schema design, since zero screens can function without them. The route wiring and stub components exist for 11 of 20 screens; the remaining 7 need route registration plus component creation.

## Gaps

1. **No RPC schema or query methods** for competition data, nation data, rankings, or world overview exist anywhere in the codebase. This is the primary blocker: every screen needs a backend query to render anything.
2. **No data models** for competition tables, fixture lists, statistics, stages, draws, awards, history, records, world rankings, or world overview exist in `packages/shared/`, `packages/contracts/`, or `packages/game-engine/`.
3. **No backend simulation code** computes competition standings, rankings, or awards — these are not yet modeled in the game-engine or season loop.
4. The existing `packages/shared/src/season/` directory has `calendar.ts` and `cupBracket.ts` but no `standings.ts`, `results.ts`, or `statistics.ts`.
5. **Screen 167 (Competition Team Statistics)** has an ambiguous match: the `teams` route exists but may have been intended as a team list, not a statistics view. The spec requirement (club performance metrics) has no implementation.