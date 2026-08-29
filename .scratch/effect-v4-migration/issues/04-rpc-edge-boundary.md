## Answer

**Settled by ticket 01's resolution.** The `Effect.runPromise` boundary moved to `index.ts`; `handleRpc` now returns `Effect.Effect`. Per-invocation `Effect.runPromise` in the IPC callback is correct because Electron's `ipcMain.handle` requires a `Promise` return value — there is no single-managed-runtime pattern that works with Electron's callback-based IPC. The pattern established by ticket 01 is the destination shape.

## Question

`apps/desktop/src/main/rpcServer.ts` uses `Effect.runPromise` at each `handleRpc` call — is this the right edge boundary, or should the entire Electron IPC be wrapped in a single `NodeRuntime.runMain` program that owns the lifecycle? The current pattern is safe per-call but diverges from the single-edge convention. Decide whether `handleRpc` stays as-is (per-invocation `runPromise`) or gets lifted into a managed program.

Type: grilling
Blocked by: 01 (needs the entry-point pattern from ticket 01 to judge against)
Status: resolved