# Renderer boundary posture

The React renderer (`apps/desktop/src/renderer`) keeps the promise-based IPC seam as-is; no Effect
runtime is introduced on the renderer side. The main process's `Effect.runPromise` at
`rpcServer.ts:154` is the single bridge from Effect-world to Promise-world.

## Rationale

- Renderer screens are simple data consumers (fetch-on-mount, mutate-on-click); they don't compose
  Effects or need a runtime.
- `effect` is in the desktop package's dependencies but unused by any renderer file.
- The real typed-error problem is in the preload bridge (`preload/index.ts:14`), which throws a
  stringified error instead of passing the structured `{_tag: "Failure", error}` envelope through.
  That's a preload-level fix, not a reason to bring Effect to the renderer.

## Consequences

- Ticket 06: Preload typed-error preservation.
- Adding an Effect runtime to the renderer is ruled out of the migration effort.
- The `"renderer behind an authored interop convention"` destination clause is satisfied by the
  existing Promise-based IPC seam.

## Decision

Renderers stay plain React/TypeScript; IPC is `window.cmClone.call(method, payload)` returning
`Promise<RpcSuccess<M>>`. No Effect runtime in the renderer.

Resolved by ticket 05 in `.scratch/effect-migration/issues/05-renderer-boundary-posture.md`.