# 06: Match Statistics component (95/100 shared)

**What to build:** A shared `MatchStatsView` component for both live and post-match statistics. The match engine produces events (Goal, ShotOnTarget, ShotMissed, etc.) but no aggregated statistics view model exists yet. This ticket delivers:
- A statistics aggregation projection in the main process
- A shared React component that renders the aggregated stats
- RPC endpoint or view model for the renderer to consume

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Statistics aggregation projection computes shots, shots on target, possession, corners, fouls, cards, offsides
- [ ] Aggregated stats are available via a view or RPC endpoint
- [ ] `MatchStatsView` component renders the aggregated stats for both teams
- [ ] Component works in both live-match and post-match contexts
- [ ] Loading and error states are handled