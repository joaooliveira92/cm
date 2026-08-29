# Effect v4 Migration

## Destination

Every entry point runs its program at the edge via a single `Effect.runPromise` (Electron apps) or `NodeRuntime.runMain` (non-Electron), every domain function that touches IO declares `Effect<A, E, R>`, expected errors are `Data.TaggedError` across the codebase, and dependencies come from Context/SqlClient. The `game-engine` and `shared` packages stay pure — bare throws in pure-domain code are replaced with `Data.TaggedError` instances thrown as typed defects, catchable by tag at the Effect boundary.

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
- [E2E seed consolidation](issues/03-e2e-seed-consolidation.md): Consolidated 4 `Effect.runPromise` calls into a single private `run` helper
- [World generation wiring](issues/06-world-generation-wiring.md): Already conforms — no changes needed
- [`.then()` lift pattern](issues/05-dot-then-lift-pattern.md): Lifted `.then()` calls in decider.ts and saves.ts to `Effect.promise` + sync transform
- [Remaining module review](issues/07-remaining-module-review.md): All three modules already conform — no changes needed

## Not yet specified

<!-- no remaining fog -->

## Out of scope

- Expand-contract patterns: game-engine and shared stay pure; no shared types need retyping across packages
- Testing/Effect interop: already established (`it` from `@effect/vitest`, `it.effect(...)`) — no ticket needed