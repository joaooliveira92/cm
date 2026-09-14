# 01 — Group G screen inventory survey

**What to build:** Survey the existing match day codebase against each of the 14 Group G screens and determine what is already built, what is partially built, and what is entirely absent.

Screens: 91 Match Preview, 92 Team Sheet, 93 Live Overview, 94 Live Commentary, 95 Live Statistics, 96 Live Player Ratings, 97 Live Tactics/Substitutions, 98 Half-Time Team Talk, 99 Post-Match Summary, 100 Post-Match Statistics, 101 Post-Match Player Ratings, 102 Post-Match Team Talk, 103 Match Report, 104 Match Incidents/Disciplinary Review.

**Blocked by:** None (can start immediately).

**Status:** resolved

## Answer

### Screen Build Status

| Screen | Status | Detail |
|--------|--------|--------|
| 91 Match Preview | **Partial** | Tab config + KickoffPanel exist; no dedicated preview view |
| 92 Team Sheet | **Partial** | Two WIP stubs (`MatchHomeTeamScreen`, `MatchAwayTeamScreen`) |
| 93 Live Overview | **Built** | `MatchDayScreen.tsx` — functional, stateful, with commentary stream, controls, score display |
| 94 Live Commentary | **Partial** | Engine built; standalone `MatchCommentaryScreen.tsx` is a WIP stub |
| 95 Live Statistics | **Partial** | WIP stub only; no statistics aggregation logic |
| 96 Live Player Ratings | **Partial** | WIP stub only; no ratings computation |
| 97 Live Tactics/Subs | **Partial** | Backend command journaling is built; UI stubs are WIP |
| 98 Half-Time Team Talk | **Absent** | No code; requires new morale/team-talk domain model |
| 99 Post-Match Summary | **Partial** | `MatchComplete` component handles score display + result accept; no dedicated summary |
| 100 Post-Match Stats | **Partial** | Same WIP stub as screen 95 |
| 101 Post-Match Ratings | **Partial** | Same WIP stub as screen 96 |
| 102 Post-Match Team Talk | **Absent** | Same as 98 — no morale/team-talk model |
| 103 Match Report | **Partial** | WIP stub exists; no report generation logic |
| 104 Incidents/Discipline | **Absent** | No code; requires new discipline model (cut from v1 per CONTEXT.md) |

1 screen **Built**, 8 **Partial**, 3 **Absent** (98/102/104 need new domain models).

Note-worthiness: Fact-finding only — no decision attached. No Agent Note warranted.