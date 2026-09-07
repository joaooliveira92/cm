# 04: Team Scout Report read and RPC

Type: task

**What to build:** The main-process read that serves a Team Scout Report for a target club, and its RPC surface. The query compacts only the *scouted* members of the target club — their assignments, progress, and attribute knowledge — together with the club's recent form and tactics, and the save's calendar, into the report, then runs it through the derivation. It respects viewer permissions: the active manager sees the human club's knowledge of a non-controlled target, and public club data only; nothing private to the target club is exposed, and a target with no scouted knowledge returns the not-scouted failure rather than an inferred report.

The edge this slice promises, inherited by every screen that calls it: `Effect<TeamScoutReport, E>` where `E` is exactly the closed union from 02, and the services the handler needs (the SQL client and the calendar) are provided inside the handler so the caller never threads a database. A report for a club id that names no club in the save is the club-not-found failure, never a redirect.

**Blocked by:** 02 (the wire shape), 03 (the derivation).

**Status:** ready-for-agent

- [ ] Requesting a report for a club with scouted members returns the report composed through the derivation, keyed on the target club id from the route.
- [ ] Requesting a club with no scouted knowledge returns the not-scouted failure, not an empty or inferred report.
- [ ] A club id that names no club in the save returns the club-not-found failure.
- [ ] The read is read-only for a non-controlled club: nothing beyond public data and the manager's own scouted knowledge of the target appears in the payload.
- [ ] The report is immutable per calendar revision: advancing the save's revision changes nothing about a report already returned for the prior revision.