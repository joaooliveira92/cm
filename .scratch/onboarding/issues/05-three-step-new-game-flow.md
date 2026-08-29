# 05: Three-step new-game flow (Manager → Club → Review)

**What to build:** The three-step stepper UI connecting the creation flow. Step 1 (Manager, built by ticket 03) with world generation running underneath. Step 2 (Club, built by ticket 04) gated until all clubs are comparison-ready with a control that states why it is waiting (determinate progress only when the unit is a fully selection-ready club; otherwise indeterminate). Step 3 (Review, showing manager name, Archetype, chosen club, Board Objective). Free return to any already-reached step with no regeneration. On commit, `commitCareer` fires, arrival on Squad with the Board Objective in the persistent shell identity (Manager · Club · Season · Objective). Cancel calls `discardCareer`, never reuses the provisional world.

**Decisions:**

- Manager → Club → Review, with generation masked behind the manager step; `createSave` splits into `beginCareer` and `commitCareer`; arrival is Squad with the Board Objective in the persistent shell. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md).
- No inbox, no news screen, no message feed in v1. The v1 screen list stays at six. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-no-onboarding-inbox.md).

**Blocked by:** 03 (Manager step + pillar creation), 04 (Club selection step)

**Status:** ready-for-agent

- [ ] Three-step creation flow: Manager → Club → Review, with a step rail showing all three
- [ ] Generation starts when player commits to New career, runs during Manager step
- [ ] Club selection gated until every club is ready; disabled control states why (e.g. "Building the league…")
- [ ] Determinate progress ("14 of 20 clubs") shown only when the unit means a fully selection-ready club; otherwise indeterminate
- [ ] Clubs never appear progressively during generation
- [ ] Generation failure offers Retry and Cancel, not a permanently disabled transition
- [ ] Free return to any already-reached step, no regeneration on return
- [ ] Review step shows manager name, Archetype, chosen club, Board Objective; deliberate final commitment action
- [ ] `commitCareer` fires atomically; arrival on Squad screen
- [ ] Persistent shell shows Manager · Club · Season · Board Objective, nothing more
- [ ] Board Objective is standing state, never dismissible, never a notification
- [ ] Cancel calls `discardCareer`; cancelled provisional world never reused
- [ ] Save list save-list "Continue career" renamed (e.g. "Load") to clear collision with the new Continue control (ticket 06)
- [ ] Returning player sees save list keyed on Manager · Club · Season; no first-run-only content
- [ ] `beginCareer`/`commitCareer`/`discardCareer` lifecycle tests at the main-process seam