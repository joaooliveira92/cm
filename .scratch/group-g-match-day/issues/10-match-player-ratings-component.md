# 07: Match Player Ratings component (96/101 shared)

**What to build:** A shared `MatchRatingsView` component for both live and post-match player ratings. No ratings computation exists yet. This ticket delivers:
- A player ratings projection in the domain layer
- A shared React component that renders per-player ratings
- RPC endpoint or view model for the renderer to consume

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Player ratings projection computes a rating (1-10) per player based on match events
- [ ] Ratings are available via a view or RPC endpoint
- [ ] `MatchRatingsView` component renders per-player ratings in a list/table
- [ ] Component works in both live-match and post-match contexts
- [ ] Loading and error states are handled