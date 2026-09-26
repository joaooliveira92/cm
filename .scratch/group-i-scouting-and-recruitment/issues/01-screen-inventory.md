# 01: Group I screen inventory survey

Type: task
Status: resolved

## Question

For each of the 14 Group I screens (118-131), what already exists in the codebase: renderer screen
and route, RPC reads and commands, domain rules in `packages/shared`, persistence? Classify each as
**Built**, **Partial** or **Absent**, and list the backend models that already exist (Scout, Scouting
Assignment, Scouting Progress, Attribute Range, Scouting Report, Team Scout Report, shortlists, player
search).

## Answer

### Classification

| Screen | Status | What exists |
|---|---|---|
| 118 Scouting Centre | **Partial** | 13-line stub `renderer/scouting/ScoutingScreen.tsx` on route `scouting`; RPC `getScouting` (scouts and what each observes) is wired in `renderer/rpc/queries.ts` but no screen reads it |
| 119 Player Search | **Partial** | 13-line stub `renderer/playerSearch/PlayerSearchScreen.tsx`; no search RPC |
| 120 Staff Search | **Partial** | 13-line stub `renderer/staffSearch/StaffSearchScreen.tsx`; no search or hire RPC; `STAFF_ROLES` is `coach` and `scout` only |
| 121 Scouting Assignment | **Partial** | RPCs `assignScout`, `assignScoutToClub`, `unassignScout`, `getScouting` (`packages/contracts/src/rpc-scouting.ts`, `main/club/scouting.ts`); UI only as `AssignScoutPanel.tsx` inside the Team Scout Report screen. Targets are a Player or a Club, with no duration |
| 122 Scouting Priorities | **Absent** | — |
| 123 Recruitment Focus | **Absent** | nav label only |
| 124 Player Shortlist | **Partial** | 13-line stub `renderer/shortlist/ShortlistScreen.tsx` with nav entry; no RPC, no table |
| 125 Staff Shortlist | **Absent** | — |
| 126 Scouting Knowledge | **Absent** | data exists: `scouting_progress` table, `squadCoverage` and `knowledgeConfidenceFor` rules; no screen or read |
| 127 Recruitment Meetings | **Absent** | — |
| 128 Squad Planner | **Absent** | nearest data: `getSquad`, `contracts` |
| 129 Transfer Target Comparison | **Absent** | `scouting/compareReports.ts` compares Team Scout Report readings, not players |
| 130 Agent and Intermediary Information | **Absent** | — |
| 131 Trial and Assessment | **Absent** | — |

### Backend that exists

- Tables: `scouting_assignments` (one row per Scout; Player or Club target), `scouting_progress` (per club and Player), `team_scout_readings`, `staff`, `bids`, `contracts`, `club_budgets`.
- Shared rules: `rules/scouting.ts` (`FULLY_SCOUTED`, `scoutingAccrual`, `nextProgress`, `attributeRange`), `rules/teamScoutReport.ts`, `rules/staff.ts` (`SCOUT_HEADCOUNT`).
- Built outside Group I: Team Scout Report (Screen 49), from the team-scout-report effort.

### Gaps worth carrying forward

- `attributeRange` is called only by the Team Scout Report. The transfer market's `MarketPlayerView` carries an exact `overallRating` and `transferValue` for any other club's player, which CONTEXT.md (Attribute Range) says a player below Fully Scouted shows only as a range. See [decision request 01](../decision-request-01-knowledge-limited-player-reads.md).
- Screens 124, 127-131 lean on Group J's `bids`, `contracts` and `club_budgets`.

