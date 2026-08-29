# Agent Note: Entry point owns the runPromise boundary

Status: proposed

## Problem

The desktop app's `apps/desktop/src/main/index.ts` used `app.whenReady().then(...)` with bare Promise chaining for the entire startup sequence, and `apps/desktop/src/main/rpcServer.ts` called `Effect.runPromise` internally in the `handleRpc` function. This scattered the `runPromise` boundary across two modules, making the entry point a plain callback rather than a structured Effect program.

## Proposal

The entry point (`index.ts`) will be the single module that calls `Effect.runPromise`, owning the edge-of-program boundary. All other modules return `Effect.Effect` types and are pure with respect to the runtime. The `handleRpc` function in `rpcServer.ts` returns `Effect.Effect<RpcResult<AppRpcMethod>>` instead of `Promise<RpcResult<AppRpcMethod>>`, with the `Effect.runPromise` call moving to the IPC handler registration in `index.ts`.

The startup sequence is wrapped in `Effect.gen(function* () { ... })` and run via `Effect.runPromise(program)` from within `app.whenReady()`. This preserves Electron's lifecycle ownership while establishing a single Effect edge. Electron APIs (BrowserWindow creation, event listeners) remain synchronous side-effect calls inside the Effect program — they are not converted to Effect functions since they are inherently synchronous Electron APIs with no error channel.

## Alternatives considered

- **NodeRuntime.runMain**: Would install `@effect/platform` and wrap the entire startup including `app.whenReady()` in a managed runtime. Rejected because Electron manages its own lifecycle (`app.whenReady()`, `app.on("window-all-closed")`, etc.) and wrapping it in a Node runtime adds a dependency with no benefit. The `Effect.runPromise` from `app.whenReady()` is the correct single-edge pattern for Electron apps.

- **Leave `handleRpc` as-is**: The original code was functionally correct. Rejected because the `runPromise` call in `rpcServer.ts` was a second runtime invocation site, making the boundary less explicit and the program structure harder to reason about.

- **Convert `createWindow` to `Effect.sync`**: The BrowserWindow creation and event listener setup is synchronous and cannot fail — wrapping it in `Effect.sync` would add ceremony without benefit. Kept as a plain function called from within the Effect program.

## Acceptance criteria

1. `apps/desktop/src/main/rpcServer.ts`'s `handleRpc` returns `Effect.Effect<RpcResult<AppRpcMethod>>`, not `Promise`
2. `apps/desktop/src/main/index.ts` is the only module calling `Effect.runPromise`
3. `tsc --noEmit` passes under `strict: true`
4. The test suite passes

## Risks

- The `effect(runEffectInsideEffect)` suggestion from the lint is expected (the IPC handler callback calls `Effect.runPromise` inside the program's `Effect.gen`) but may confuse future readers. Addressed by keeping the IPC handler registration as a plain callback, not an Effect function.