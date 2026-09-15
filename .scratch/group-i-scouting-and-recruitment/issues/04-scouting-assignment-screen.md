# 04: Scouting Assignment screen (Screen 121)

**What to build:** A standalone Scouting Assignment screen listing every Scout with quality, current target and Scouting Progress, read from `getScouting`. The manager assigns a free or busy Scout to a Club chosen from the League Table read (`assignScoutToClub`) and ends any assignment (`unassignScout`). A Scout already observing a Player shows that target; creating a new Player target is not offered in v1. Typed errors show inline, as `AssignScoutPanel` does.

**Decisions:**

- Group I v1 scope: 3 screens in scope, 11 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-i-v1-scope.md).
- New Player targets wait for [decision request 01](../decision-request-01-knowledge-limited-player-reads.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Screen lists every Scout with quality, target (Club, Player or none) and Scouting Progress
- [ ] Assigning a Scout to a Club and ending an assignment go through the existing commands and refresh the list
- [ ] Scout roster row is a component reusable on Screen 118
