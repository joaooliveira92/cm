## Answer

**All three modules already conform.** `training.ts`, `aiClubs.ts` (which also already defines its own `SquadTooSmallError` tagged error), and `managerStatus.ts` all use `Effect.gen`, `yield* SqlClient`, tagged errors, and no `Effect.runPromise` internally. No changes needed.

## Question

Each module under `apps/desktop/src/main/` (training, aiClubs, managerStatus) needs review against the v4 conventions established in tickets 01-03:
- Do they use `Effect.gen` / `yield* SqlClient` appropriately?
- Are there bare `throw` or `new Error(...)` instances?
- Do they follow the `Effect.runPromise`-at-edge pattern?

Review and ticket any issues found.

Type: task
Blocked by: None (can start immediately)
Status: resolved