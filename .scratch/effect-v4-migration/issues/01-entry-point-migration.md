## Answer

**Moved `Effect.runPromise` boundary into `index.ts`; `handleRpc` returns `Effect.Effect`, not `Promise`. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-entry-point-edge-boundary.md).

## Question

Convert `apps/desktop/src/main/index.ts` from bare `app.whenReady().then(...)` to a structured Effect program run with `NodeRuntime.runMain`. The entry point should:
- Establish the `SqlClient` layer
- Set up the RPC handler
- Create the window
- Handle lifecycle (activate, window-all-closed) as Effect finalizers or structured listeners

Type: task
Blocked by: None (can start immediately)
Status: resolved