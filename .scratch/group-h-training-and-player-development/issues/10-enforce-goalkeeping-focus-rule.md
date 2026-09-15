# 10: Enforce the Goalkeeping Training Focus rule in main

**What to build:** `setTrainingFocus` in `apps/desktop/src/main/club/training.ts` accepts any Category for any own-club player, so a Goalkeeping Training Focus can be set on an outfield player. CONTEXT.md (Training Focus) says a Category is only offerable for a player whose Attributes it contains. Ticket 06 applies that rule in the renderer only (`offeredTrainingFocuses` in `apps/desktop/src/renderer/training/trainingFocusOptions.ts`). Move the predicate into `packages/shared/src/rules/training.ts`, reject the command in main with a new tagged error declared in `packages/contracts`, and have the renderer import the shared predicate.

Found in ticket 06 review. Saves written before this fix can already hold an off-rule Goalkeeping focus; ticket 06's picker shows that value as pressed and disabled, and the fix needs a stated position on those rows (leave as-is, or clear on load with a migration).

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One shared predicate decides which Categories a player may take as Training Focus
- [ ] `setTrainingFocus` rejects an off-rule Category with a tagged error, with an RPC roundtrip test
- [ ] Renderer uses the shared predicate; existing off-rule rows have a stated, tested behaviour
