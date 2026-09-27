# 07: Performance Report screen (Screen 113)

**What to build:** Populate the existing `PlayerCoachReportScreen` stub with real data: player's Training Focus, development progress (attribute changes over recent seasons), coach rating, and training compliance summary. Reads existing player state and development data.

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Training Focus and development progress shipped. Coach rating waits on [decision request 01](../decision-request-01-performance-report-coach-rating.md); first-Season progress waits on [decision request 02](../decision-request-02-development-baseline-in-events.md). Training compliance is omitted: no data model exists in v1.

- [ ] Performance report shows training focus, development progress, and coach rating
- [x] Reads from existing player state and development data
- [x] Stub content replaced with real data

**Triaged 2026-09-27: `ready-for-agent`.** Both decision requests were answered 2026-09-19 with
Option A. [Request 01](../decision-request-01-performance-report-coach-rating.md): show the club Coach's
1–20 value, labelled "Coach quality", and use the same label on Screen 111.
[Request 02](../decision-request-02-development-baseline-in-events.md): new `PlayerDeveloped` events
carry the pre-development Attributes, and a Season whose event predates that shows an explicit
no-comparison state. Agent Note:
[the Performance Report shows what it can prove](../../../.agents/notes/proposed/feature/2026-09-19-the-performance-report-shows-what-it-can-prove.md).
Neither part had shipped at triage.
