# Match sub-screen placeholders

Type: task
Status: resolved
Blocked by: 01

## Question

After Batch 1, create skeleton placeholder screens for match sub-screens.

Sub-screens from CM 03/04 IA:
- Match Stats, Player Stats, Home Team, Away Team, Ratings, Latest Scores, League Table, Tactics, Substitutions, Opposition Instructions, Commentary, Replays, Match Report

## Answer

**13 match sub-screen placeholders created** as flat routes at `/career/$saveId/match-*` (match-stats, match-player-stats, match-home-team, match-away-team, match-ratings, match-latest-scores, match-live-table, match-match-tactics, match-substitutions, match-opposition-instructions, match-commentary, match-replays, match-report). Uses the Batch 1 `defineCareerChild` pattern. See main [Agent Note](../../../.agents/notes/proposed/feature/2026-09-11-career-scoped-placeholder-screens.md).