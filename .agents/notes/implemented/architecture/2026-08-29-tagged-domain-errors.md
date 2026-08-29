# Agent Note: Tagged domain errors for game-engine invariants

Status: implemented

## Problem

`packages/game-engine/src/match/tactical-modifiers.ts:19` threw `new Error("no phase defined for position ...")` — a bare `Error` with a string message, invisible to Effect's type system. Any consumer of the game engine could not catch this error by tag, and there was no typed error class to match against. The scan of `packages/contracts/src/`, `apps/desktop/src/main/`, and `packages/game-engine/src/` confirmed this was the only bare `throw new Error(...)` in program logic across the migration scope.

## Decision

Domain errors in the game engine are defined as `Data.TaggedError` classes and thrown as typed objects rather than bare `Error` instances. Each error class carries the context a consumer needs (e.g. the `position` that had no phase) and is catchable by tag at the boundary.

The `NoPhaseForPositionError` class is exported from `tactical-modifiers.ts` and re-exported from the package index, so consumers can import and match it:

```ts
import { NoPhaseForPositionError } from "@cm-clone/game-engine";
```

At the desktop boundary, callers can catch it with `Effect.catchTag("NoPhaseForPositionError", ...)` or map it to `Effect.die` if it's treated as a defect.

## Alternatives considered

- **Keep `new Error("string soup")`**: Works at runtime but invisible to the type system, uncaught by tag, untyped. No improvement.

- **Define a plain class (no Effect dep)**: Would work but `Data.TaggedError` provides the `_tag` discriminant and `Effect.catchTag` compatibility for free. The game engine already depends on `effect`, so there is no additional dependency cost.

- **Return the error as a Result union instead of throwing**: More architecturally pure but would change every caller's return type across the entire `resolveTeamTactics` → `computePhaseStrengths` → `resolveTacticalModifiers` chain. The single throw is an invariant violation (defect), not a recoverable error path, so throwing (and mapping to `Effect.die` at the boundary) is appropriate.

- **Make it a top-level `Effect.die` in the game engine**: Would require the engine to use `Effect<A, E, R>` return types, breaking the purity convention.

## Consequences

1. `NoPhaseForPositionError` is defined as `Data.TaggedError` in `packages/game-engine/src/match/tactical-modifiers.ts`
2. The `throw new Error(...)` is replaced with `throw new NoPhaseForPositionError({ position })`
3. The class is exported from the package index
4. `tsc --noEmit` passes under `strict: true`
5. All tests pass
6. No other `throw new Error(...)` instances remain in `packages/game-engine/src/`, `packages/contracts/src/`, or `apps/desktop/src/main/`
7. Tagged errors thrown (not yielded) in pure functions must be caught via `throw`/`catch` or `Effect.try` at the boundary — no different from the original `throw new Error(...)`, just better typed. Future migration of the game engine into Effect could convert these to `yield*`-safe errors.