## Answer

**`NoPhaseForPositionError` defined in `tactical-modifiers.ts`; no other bare `throw new Error(...)` in scope. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-tagged-domain-errors.md).

## Question

Replace all bare `throw new Error(...)` instances in program logic (not test helpers or script assertions) with `Data.TaggedError` classes. Current known sites:
- `packages/game-engine/src/match/tactical-modifiers.ts:19` — `throw new Error("no phase defined for position...")`

Scan for additional bare throws in `packages/game-engine/`, `packages/contracts/`, `apps/desktop/src/main/` (excluding test files and e2e tests). Each domain gets its own tagged error that is catchable by tag.

Type: task
Blocked by: None (can start immediately)
Status: resolved