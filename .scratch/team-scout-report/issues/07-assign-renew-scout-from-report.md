# 07: Assign or renew a scouting assignment from the report

Type: task

**Follow-on (parked for a later session):** beyond the first tracer-bullet pass (tickets 01-06).

**What to build:** From inside the report screen, the manager can point a scout at the target club and renew an expiring report. The Assign Scout tab becomes functional: it lists the human club's free scouts, assigns one to the target club, and lets the manager renew when a report's freshness has decayed past a threshold. The assignment builds on the existing per-player scouting — assigning to a club assigns to the club's squad through the same rules — and the mutation is idempotent and revision-bound: submitting the same assignment twice has no second effect, and a stale revision is rejected rather than silently applied.

**Blocked by:** 06 (the report screen), 04 (the report RPC the assignment flows through).

**Status:** ready-for-agent

- [ ] From the report, a manager can assign a free scout to the target club and see the assignment take effect.
- [ ] A report whose freshness has decayed can be renewed from the report screen.
- [ ] Submitting the same assignment twice is a no-op the second time (idempotency test).
- [ ] A mutation submitted against a stale revision is rejected, not applied.
- [ ] The screen reflects the post-mutation report state without a full reload.