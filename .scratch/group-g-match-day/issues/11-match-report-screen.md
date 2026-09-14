# 08: Match Report screen (103)

**What to build:** A match report screen showing a narrative summary of the match — key events timeline, goalscorers, cards, substitutions, injuries, and match statistics summary. No report generation logic exists yet. This ticket delivers:
- Match report generation logic in the domain layer
- A React component that renders the report
- RPC endpoint or view model for the renderer to consume

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Match report generation produces a structured summary of all key events
- [ ] Report includes goalscorers, cards, substitutions, injuries, and final score
- [ ] Report screen renders the narrative summary
- [ ] Screen is accessible via the post-match tab navigation
- [ ] Loading and error states are handled