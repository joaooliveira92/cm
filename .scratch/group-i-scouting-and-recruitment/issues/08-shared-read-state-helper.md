# 08: One read-state helper for the scouting and training screens

**What to build:** Five places turn an atom result into loading, typed failure or ready, each with its own message component: `ScoutingScreen` (`ScoutRoster`, `Coverage`, `SectionMessage`), `ScoutingKnowledgeScreen` (`KnowledgeMessage`), `ScoutingAssignmentScreen` (`AssignmentMessage`) and `training/CoachingAssignmentsScreen` (`CoachingMessage`). Each repeats `typedError`, a failure check falling back to a sentence or `describeRpcError`, and an `Initial` check. Extract one renderer helper and one message component and use them in all five, with no change to what any screen shows.

Found in ticket 06 review, the fourth and fifth copies.

**Decisions:**

- Group I v1 scope: see [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One helper maps a read to loading, failure message or value, and the five sites use it
- [ ] Every screen's existing renderer tests pass unchanged
