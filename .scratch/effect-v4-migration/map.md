# Effect v4 Migration

## Destination

Every entry point runs its program at the edge via `NodeRuntime.runMain`, every domain function that touches IO declares `Effect<A, E, R>`, no bare throws in program logic, expected errors are `Data.TaggedError` across the codebase, and dependencies come from Context/SqlClient. The `game-engine` and `shared` packages wrap at the boundary rather than converting their pure internals.

## Notes

- **Pinned Effect version**: `4.0.0-rc.112` (catalog), TypeScript `7.0.2`, `"strict": true` in tsconfig
- Load the `effect-code` skill every session
- `SqlClient` from `effect/unstable/sql/SqlClient` — keep as-is until stable release, do not ticket
- `game-engine` and `shared` stay pure; wrap at the boundary with `Effect.sync`
- Domain modules (saves, season, transfers, match, etc.) stay as free functions, not Context.Services — they already use `yield* SqlClient` and `Effect.gen`
- Never widen a ticket's blast radius; keep every step green (`tsc --noEmit` + test suite)

## Decisions so far

- [Entry point migration](issues/01-entry-point-migration.md): Moved `Effect.runPromise` boundary into `index.ts`; `handleRpc` returns `Effect.Effect`, not `Promise`
- [RPC edge boundary](issues/04-rpc-edge-boundary.md): Per-invocation `Effect.runPromise` in IPC callback is correct — Electron's `ipcMain.handle` requires a `Promise` return
- [Tagged error audit](issues/02-tagged-error-audit.md): `NoPhaseForPositionError` defined in game-engine; no other bare throws in scope

- Game-engine wrapping seam: how to wrap pure functions (e.g. `resolveTacticalModifiers`, `createSeededRng`, `simulateMatch`) at the boundary — `Effect.sync` per call, or a single wrapped module?
- The `.then()` call sites in `decider.ts` (`readdir(savesDir).then(...)`) and `saves.ts` — need a consistent `Effect.promise` or `Effect.tryPromise` pattern
- World generation (`generateWorld`) — how it wires into the startup Effect
- Training focus (`training.ts`), AI clubs (`aiClubs.ts`), manager status (`managerStatus.ts`) — may have unique concerns not surfaced yet
- Testing/Effect interop: how vitest + `@effect/vitest` patterns work across the migrated modules
- Expand-contract patterns: if a shared type needs retyping across packages, the migration plan per type

## Out of scope

<!-- work ruled out of this effort; never graduates -->