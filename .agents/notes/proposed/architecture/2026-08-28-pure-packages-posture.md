# Agent Note: Pure packages stay pure — lift at the desktop boundary

Status: proposed

## Decision

The migration posture for `@cm-clone/game-engine` and `@cm-clone/shared` is **keep them pure**:
plain synchronous functions, deterministic from a seed, no IO, no async, no `Effect` imports. The
Effect world lives in `apps/desktop` main-process logic; engine and shared modules are called from
Effect code by lifting at the seam with `Effect.sync` / `Effect.try` at each desktop→engine call
site. The interior invariant throw in `packages/game-engine/src/match/tactical-modifiers.ts:19`
("no phase defined for position") stays a throw, surfacing through a `try`-lift as a **defect**
(`UnknownError`), never remapped to a tagged failure. The unused `effect` dependency in
`packages/game-engine/package.json` is removed, since the package never imports Effect and under
this posture never will.

## Why the other options lost

- **Full Effect internals** — retype every engine/shared function to `Effect<A, E, R>`, tagged
  errors, `RandomSource` in `Context`. Rejected: the packages have no expected failures, no IO, no
  async, so Effect's error and requirements channels buy nothing at this latitude. It churns the
  plain-vitest engine/shared tests, threads `E` through a call graph with no failures to track, and
  contradicts the migration destination, which scopes `Effect<A, E, R>` typing to desktop main logic.
- **Hybrid (pure internals, but the one throw → `Effect.fail` + tagged error)** — rejected as the
  worst of both: it turns an unreachable programmer-error invariant into typed failure plumbing
  across pure code, threading `E` through `resolveTeamTactics`, `computePhaseStrengths`, and
  `resolveTacticalModifiers` and every engine caller, for an error no valid tactic reaches. It
  manufactures an expected-failure channel callers would be tempted to catch.
- **Keep the unused `effect` dependency** — rejected: dead weight today, stays dead under this
  posture, and keeping it licenses a wrong assumption that the engine is Effect-hostile-to-touch.
  Removing it makes the posture visible in package.json. (`@effect/vitest` in the engine's
  devDependencies is a separate dev-dep hygiene question, not covered here.)

## Consequences

- Ticket 03's lift convention writes "engine throws are defects" into the boundary rule: a `try`-lift
  must not remap engine/shared throws to tagged errors.
- Engine/shared tests keep calling plain functions directly; no vitest/Effect test churn.
- The `RandomSource`-stays-a-param vs moves-to-Context question remains open in ticket 03, since
  engine/shared never reference Context under this posture.

## Verification

A seam converting engine/shared calls to `Effect.sync`/`Effect.try` at the desktop boundary is green
when `pnpm -r typecheck` (strict) and `pnpm -r test` pass, and each lift's boundary is explicit —
remapped only when the throw is an expected domain failure, left as a defect when it is an invariant.

## Coverage gaps

- Whether `@effect/vitest` stays a devDependency of `packages/game-engine` is unticketed.
- Whether any desktop caller currently leans on the engine throw as a control-flow mechanism (rather
  than a true invariant) is not yet verified; the desktop domain throws are handled in ticket 02.