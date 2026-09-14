# 03: Standalone Commentary screen (94)

**What to build:** A dedicated full-screen commentary feed view. The commentary engine (`packages/game-engine/src/match/commentary.ts`) and stream persistence are already built; `resumeSimulation` already returns `CommentaryLineView[]`. This ticket delivers the renderer screen that displays the live commentary lines.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Standalone commentary screen shows commentary lines in chronological order
- [ ] New commentary lines appear as the match progresses
- [ ] Screen is accessible via the live-match tab navigation
- [ ] Loading, empty, and error states are handled