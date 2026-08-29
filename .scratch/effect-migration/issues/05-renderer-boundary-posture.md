# 05: Renderer boundary posture

## Question

The React renderer (`apps/desktop/src/renderer`, 7 screens) and the preload bridge import no
Effect; they talk to the main process over IPC, which is where theEffect world sits. Decide the
renderer-side convention: keep the promise-based IPC seam exactly as-is (main already runs its RPC
programs through `Effect.runPromise` at the edge), or introduce an Effect runtime/interop on the
renderer side. The decision fixes the destination's "renderer behind an authored interop convention"
clause and gates the preload-bridge question in the fog.

## Answer

**Keep the promise-based IPC seam as-is.** The renderer stays pure React/TypeScript; it calls
`window.cmClone.call(method, payload)` and gets back a `Promise<RpcSuccess<M>>`. No Effect runtime
in the renderer.

Rationale from the codebase:

1. **Main already has the canonical single boundary** — `Effect.runPromise` at `rpcServer.ts:154`,
   wrapping every handler's Effect in `{_tag: "Success"/"Failure"}`. Adding a second runtime on the
   renderer side would create two Effect worlds when one already works.

2. **Renderer screens are simple data consumers** — fetch-on-mount via `useEffect` + `.then()`/`.catch()`,
   mutate-on-click via `async` handlers. No Effect chains, no service composition, no need for
   dependency injection. The raw `window.cmClone.call()` pattern matches renderer complexity exactly.

3. **`effect` is in `apps/desktop/package.json`** but no renderer file imports it. Adding imports to
   every screen for `Effect.tryPromise` + `Effect.runPromise` + `Data.TaggedError` would add ceremony
   without benefit — every IPC call is a single fire-and-await.

4. **The real typed-error problem is in the preload bridge**, not the renderer convention.
   `apps/desktop/src/preload/index.ts:14` catches `{_tag: "Failure", error}` and throws
   `new Error(stringified_tag)`, destroying the structured error. The renderer `.catch()` blocks
   only see a generic string. Fix: pass the full error object through so the renderer can match on
   the actual error shape. This is a separate ticket (06).

5. **No existing abstraction to refactor** — zero custom hooks, zero data-fetching libs. Adding an
   Effect layer would be additive complexity, not a consolidation.

This decision is consistent with the migration's standing rules: the Effect runtime lives in the
main process, the renderer sits behind an explicit Promise interop seam, and typed errors need a
preload-level fix to cross intact.

**Decision:** Keep promise-based IPC; no Effect runtime in the renderer.
**Graduated:** The preload error-loss bug becomes ticket 06 (preload typed-error preservation).
**Out of scope (refined):** Adding an Effect runtime to the renderer is ruled out of this effort.

Type: grilling
Blocked by: none (can start immediately)
Status: resolved