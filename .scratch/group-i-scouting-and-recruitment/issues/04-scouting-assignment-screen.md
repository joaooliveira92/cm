# 04: Scouting Assignment screen (Screen 121)

**What to build:** A standalone Scouting Assignment screen listing every Scout with quality, current target and Scouting Progress, read from `getScouting`. The manager assigns a free or busy Scout to a Club chosen from the League Table read (`assignScoutToClub`) and ends any assignment (`unassignScout`). A Scout already observing a Player shows that target; creating a new Player target is not offered in v1. Typed errors show inline, as `AssignScoutPanel` does.

**Decisions:**

- Group I v1 scope: 3 screens in scope, 11 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-i-v1-scope.md).
- New Player targets wait for [decision request 01](../decision-request-01-knowledge-limited-player-reads.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Screen lists every Scout with quality, target (Club, Player or none) and Scouting Progress
- [x] Assigning a Scout to a Club and ending an assignment go through the existing commands and refresh the list
- [x] Scout roster row is a component reusable on Screen 118

## Answer

Shipped at `/career/$saveId/scouting-assignment` (`ScoutingAssignmentScreen`), reached from a Recruitment nav item until the Scouting Centre (06) links to it. `ScoutRosterRow` takes props only, with actions passed as children. Two things the ticket did not say:

- `assignScoutToClub` needs an `expectedReportId`. The screen reads the chosen Club's `getTeamScoutReport` and takes `reportId` from a delivered report or `currentReportId` from `ClubNotScoutedError`, as the Team Scout Report does. The renderer never builds the id.
- Assigning to an unscouted Club never worked in the real app: typed errors lost their fields crossing IPC. Fixed first as [07](07-typed-rpc-errors-survive-ipc.md).

A Club target shows "Tracked per Player" rather than a percentage, because a Club carries no Scouting Progress of its own (CONTEXT.md, Scouting Assignment).

