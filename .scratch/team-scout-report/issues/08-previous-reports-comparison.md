# 08: Previous reports comparison

Type: task

**Follow-on (parked for a later session):** beyond the first tracer-bullet pass (tickets 01-06).

**What to build:** The Previous Reports tab becomes functional: the screen lists the target club's earlier reports and lets the manager compare the current report against a previous one, seeing how knowledge confidence, findings, key players, and predicted formation have changed between observations. Reports are keyed by stable report id, listed newest-first with a deterministic tie-breaker, and comparing is read-only. A report whose target club has changed competition mid-season still reads correctly (spec §19).

**Blocked by:** 06 (the report screen).

**Status:** ready-for-agent

- [ ] The Previous Reports tab lists the target club's earlier reports, newest first, each keyed by a stable report id.
- [ ] Selecting a previous report shows the differences from the current report (confidence, findings, key players, predicted formation).
- [ ] Comparing is read-only and cancellation-safe: switching reports discards the in-flight previous-response.
- [ ] A report from a season in which the club changed competition renders without error.