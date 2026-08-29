## Answer

**Both `.then()` call sites lifted.** `decider.ts:17-19` and `saves.ts:59-61` now use `yield* Effect.promise(() => readdir(...))` followed by a plain `entries.includes(...)`, separating async from sync.

## Question

`apps/desktop/src/main/decider.ts` and `apps/desktop/src/main/saves.ts` use `readdir(savesDir).then(...)` — bare `.then()` calls outside Effect. Convert these to `Effect.promise(() => readdir(...))` so all async follows the same pattern.

Type: task
Blocked by: 01 (entry-point pattern settled)
Status: resolved