## Answer

**Already conforms.** `generateWorld` uses `Effect.gen` + `yield* SqlClient` — consistent with the established v4 patterns. No changes needed.

## Question

Decide how to wire `apps/desktop/src/main/worldGeneration.ts` into the startup Effect program. Currently called from `createSave` — is its dependency pattern (already a free Effect function with `SqlClient`) consistent with the rest of the codebase?

Type: research
Blocked by: None (can start immediately)
Status: resolved