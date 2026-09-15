# 07: Performance Report screen (Screen 113)

**What to build:** Populate the existing `PlayerCoachReportScreen` stub with real data: player's Training Focus, development progress (attribute changes over recent seasons), coach rating, and training compliance summary. Reads existing player state and development data.

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** needs-info

Training Focus and development progress shipped. Coach rating waits on [decision request 01](../decision-request-01-performance-report-coach-rating.md); first-Season progress waits on [decision request 02](../decision-request-02-development-baseline-in-events.md). Training compliance is omitted: no data model exists in v1.

- [ ] Performance report shows training focus, development progress, and coach rating
- [x] Reads from existing player state and development data
- [x] Stub content replaced with real data