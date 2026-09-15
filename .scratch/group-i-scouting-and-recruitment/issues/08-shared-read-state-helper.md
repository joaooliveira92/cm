# 08: One read-state helper for the scouting and training screens

**What to build:** Five places turn an atom result into loading, typed failure or ready, each with its own message component: `ScoutingScreen` (`ScoutRoster`, `Coverage`, `SectionMessage`), `ScoutingKnowledgeScreen` (`KnowledgeMessage`), `ScoutingAssignmentScreen` (`AssignmentMessage`) and `training/CoachingAssignmentsScreen` (`CoachingMessage`). Each repeats `typedError`, a failure check falling back to a sentence or `describeRpcError`, and an `Initial` check. Extract one renderer helper and one message component and use them in all five, with no change to what any screen shows.

Found in ticket 06 review, the fourth and fifth copies.

**Decisions:**

- Group I v1 scope: see [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] One helper maps a read to loading, failure message or value, and the five sites use it
- [x] Every screen's existing renderer tests pass unchanged

## Answer

`readState(result, { loading, failed })` in `apps/desktop/src/renderer/rpc/readState.ts` returns `Loading`, `Failed` (the error's own sentence or the fallback) or `Ready` with the value, and all five sites use it. `ReadStateMessage` (`components/shared/`) replaces `AssignmentMessage`, `KnowledgeMessage` and `CoachingMessage`. The Scouting Centre's two sections keep their own `SectionMessage`: they render a line inside the page with `role="alert"` on failure, not a page `<main>`, so the shared shell would change what they show.

