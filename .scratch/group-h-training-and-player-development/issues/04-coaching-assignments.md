# 04: Coaching Assignments screen (Screen 111)

**What to build:** A Coaching Assignments screen showing the club's coaching staff with their quality ratings and assigned departments. Uses existing coach model (`coachModifier` in `staff.ts`, coach quality loaded from DB). Read-only in v1.

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

<!-- Implementation started by implementator on 2026-09-15 -->

- [x] Coaching assignments screen renders with coach name, quality rating, and department
- [x] Uses existing coach data from the staff/coach DB model
- [x] Coach assignment card component is extractable for reuse in Screen 105