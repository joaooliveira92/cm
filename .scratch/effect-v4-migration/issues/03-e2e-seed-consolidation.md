## Question

`apps/desktop/e2e/seedSaves.ts` has 4 standalone `Effect.runPromise(createSeedSave(...))` calls outside a structured program. Consolidate these into a single seeded program that runs all saves under one `Effect.runPromise` or, better, a `NodeRuntime.runMain`-compatible entry pattern. Decide whether this file should be restructured or replaced.

Type: task
Blocked by: 01 (needs the entry-point pattern to be settled before restructuring seed scripts)
Status: open