# 06: Individual Training Plan screen (Screen 108)

**What to build:** An enhanced per-player Training Plan screen building on the existing Training Focus picker (currently in `PlayerDevelopmentScreen.tsx`). Allows the manager to view and set each player's training focus Category (Technical, Mental, Physical, Goalkeeping, or None). Uses the existing `setTrainingFocus` RPC.

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Per-player training plan shows current focus with a clear picker
- [ ] Set or clear training focus via existing `setTrainingFocus` RPC
- [ ] Plan summary card component is extractable for reuse in Screens 105 and 114