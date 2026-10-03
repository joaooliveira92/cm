# 03 — Build sequence for 8 partial screens

**What to build:** Order the 8 partial screens by dependency, feasibility, and shared-component opportunities. Key questions:

- Should live/post-match stats (95/100) share a single stats component?
- Should live/post-match ratings (96/101) share a single ratings component?
- Which partial screens can reuse existing match engine data directly (94, 97)?
- Which need new view models or RPC endpoints?

Screens: 91 (Match Preview), 92 (Team Sheet), 94 (Live Commentary standalone), 95/100 (Stats), 96/101 (Ratings), 97 (Tactics/Subs), 99 (Post-Match Summary), 103 (Match Report)

**Blocked by:** 02 (scope must be settled first so we know the full set)

**Status:** resolved

## Answer

### Shared component pairs

- **95 Live Stats / 100 Post-Match Stats** — Shared `MatchStatsView` component; the same data rendered at different match phases.
- **96 Live Ratings / 101 Post-Match Ratings** — Shared `MatchRatingsView` component; same principle.

### Build priority (fewest dependencies first)

| Priority | Screen(s) | Rationale |
|----------|-----------|-----------|
| 1 | 92 Team Sheet | Pure UI — all data (squad, formation) loaded by match start |
| 2 | 91 Match Preview | Pure UI — fixtures, standings, head-to-head data exists |
| 3 | 94 Commentary (standalone) | Engine + streams built; needs screen component only |
| 4 | 97 Tactics/Subs UI | Backend commands/journaling built; needs UI components |
| 5 | 99 Post-Match Summary | Basic score display exists; needs richer summary view |
| 6 | 95/100 Stats (shared) | Needs new statistics aggregation view model |
| 7 | 96/101 Ratings (shared) | Needs new ratings computation |
| 8 | 103 Match Report | Needs new report generation logic |

Screens 1-5 can use existing data with zero new engine work. Screens 6-8 need new view models or RPC endpoints.

Note-worthiness: Execution plan only — no durable architectural decision. No Agent Note warranted.