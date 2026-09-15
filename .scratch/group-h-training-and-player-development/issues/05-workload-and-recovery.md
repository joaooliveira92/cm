# 05: Workload and Recovery screen (Screen 112)

**What to build:** A Workload and Recovery screen showing each player's current condition and recovery status. Uses existing match-driven condition/recovery engine (`conditionAfterDays`, `recoverClubFitness`). Shows a simple rest/active indicator — no training-specific workload model in v1.

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Workload screen shows player condition and recovery status per player
- [x] Workload gauge component is extractable for reuse in Screens 105 and 114
- [x] Reads from existing player fitness data