---
name: effect-code
description: "Write Effect (v4) code with its conventions: the Effect<A, E, R> type, constructors, running, Effect.gen vs pipelines, composition, and control flow. Use when writing or reviewing code that uses the `effect` package, or when the user asks to write Effect code, fix Effect types/errors, or structure an Effect program. Also handles self-maintenance: when asked to update, refresh, or extend this skill from the source notes, run the self-maintenance pass instead of asking what to prioritize."
---

# Effect Code

Reference for writing Effect v4 code. Distilled from the official docs (see `references/effect-report/` for the fuller per-topic notes: `effect-v4-getting-started.md`, `effect-v4-error-management.md`, `effect-v4-resource-management.md`, `effect-v4-requirements-management.md`, and siblings for concurrency, data types, scheduling, observability, testing, etc. — bundled inside this skill so it travels with it). This skill is self-contained: copy the whole `effect-code/` directory to use it in another project, no other paths required.

## Self-maintenance

This file is a lossy compression of `references/effect-report/`. It goes stale in two ways: a topic was never folded in, or a source file changed after its section was written. Closing that gap is this skill's own job, not the user's — when invoked to update, refresh, or extend itself, run the pass below without waiting to be told which topic.

1. Open `references/distillation-state.md`. It fixes the three priority tiers, the coverage rubric, and the exact topic table — read it, don't re-derive it.
2. Follow its "Running a self-maintenance pass" steps as written: hash-check every source against the table, compute `gap = weight(tier) × (100 − coverage)` per topic, take the max (ties: lower tier number, then alphabetical), distill only that one topic into this file, re-score it honestly, and write the updated row back.
3. One topic per run. A topic landing below 100 is fine and expected — it leaves an accurate gap for the next run instead of a false "done" that stops the mechanism from ever revisiting it.
4. Report which topic was picked, why (its gap number vs. the runner-up), and the new coverage score — the state file is the memory, so nothing else needs to persist across runs.

## The core idea

An `Effect` is a **lazy**, immutable description of a workflow. It does not run until you execute it. Its type tracks three things:

```ts
Effect<Success, Error, Requirements>
```

- `Success` — value on success. `void` = no info; `never` = runs forever.
- `Error` — expected errors. `never` = cannot fail.
- `Requirements` — context needed to run. `never` = none. Shorthand `A`, `E`, `R`.

Errors are **values, not throws**. A function that can fail says so in its type:

```ts
const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0 ? Effect.fail(new Error("Cannot divide by zero")) : Effect.succeed(a / b)
```

## Construction (choose by what the operation can do)

| Operation | Constructor | Error if it throws/rejects |
|---|---|---|
| always succeeds, has value | `Effect.succeed(value)` | — |
| expected recoverable failure | `Effect.fail(error)` | — |
| sync side effect, must not throw | `Effect.sync(() => ...)` | → defect |
| sync that may throw | `Effect.try(() => ...)` | → `UnknownError` |
| async, guaranteed to resolve | `Effect.promise(() => ...)` | → defect |
| async that may reject | `Effect.tryPromise(() => fetch(...))` | → `UnknownError` |
| callback-style API | `Effect.callback<A, E>((resume) => ...)` | via `resume(Effect.fail(...))` |

Remap thrown/rejected errors to your domain with the `{ try, catch }` overload:

```ts
Effect.tryPromise({
  try: () => fetch(url),
  catch: (u) => new Error(`something went wrong ${u}`),
})
```

## Structure: two spellings, pick one per region

**Pipelines** — `pipe(value, fn1, fn2, ...)`, each `fn` takes a single argument. Left-to-right. The primary operators:

- `Effect.map(f)` — transform success value.
- `Effect.flatMap(f)` — chain; `f: A => Effect<B>`. Never ignore an effect inside the callback — chain it explicitly.
- `Effect.andThen(next)` — run next; `next` is an `Effect` or `A => Effect`. If you're only producing a plain value, use `map`.
- `Effect.tap(f)` — run a side effect (logging), **keep** the value.
- `Effect.as(const)` — replace the value with a constant.
- `Effect.all([a, b])` — combine into tuple/struct/record. Sequential by default, short-circuits on first error. `{ mode: "result" }` runs all and collects `Result`s.

`myEffect.pipe(fn1, fn2)` is equivalent to `pipe(myEffect, fn1, fn2)` and needs no import.

- **Generators** — `Effect.gen(function* () { const x = yield* someEffect; ... return value })`. Reads like `async`/`await`, allows `if`/`for`/`while`. Needs `target: "es2015"`+ or `downlevelIteration`. `yield*` short-circuits on the first failing effect.

Either works. The failing step stops the program at the first error in both spellings.

## Running at the edge

Run effects at the edge of the program, not scattered through it.

| | Use |
|---|---|
| `Effect.runSync(e)` | purely synchronous, immediate result |
| `Effect.runPromise(e)` | async, returns `Promise<A>` |
| `Effect.runPromiseExit(e)` | async, returns `Promise<Exit<A, E>>` (see failures/defects) |
| `Effect.runFork(e)` | run in background on a fiber (default choice) |

`runSync` throws on a failing or async effect — don't use it where either can occur.

## Error handling

Effect distinguishes **expected errors** (part of the domain — tracked in `E`, recoverable) from **defects** (bugs/violated invariants — live in the `Cause`, not `E`; don't recover from these in domain logic, only at boundaries).

- **Raise expected errors** with tagged classes, directly yieldable in `Effect.gen` (no `Effect.fail` wrapper needed):
  ```ts
  class UserNotFound extends Data.TaggedError("UserNotFound")<{ readonly id: string }> {}
  const findUser = (id: string): Effect.Effect<string, UserNotFound> =>
    Effect.gen(function* () {
      if (id === "missing") return yield* new UserNotFound({ id })
      return "Alice"
    })
  ```
  Use `Data.Error` instead when no discriminant tag is needed.
- **Catch selectively**, narrowest first: `Effect.catchTag("Tag", f)` / `Effect.catchTags({...})` for one or more members of a tagged union (removes them from the resulting `E`); `Effect.catchIf(predicate, f)`; `Effect.catchFilter(Filter.tagged("Tag"), f)`. Prefer these over the blanket `Effect.catch(f)` (handles every typed error) when you want the compiler to keep tracking what's unhandled.
- **Defects** — `Effect.die(error)` raises one; `Effect.orDie` (optionally after `Effect.mapError` to customize the message) converts a typed failure into a defect when it's truly unrecoverable. Recover from defects only at explicit boundaries: `Effect.catchDefect` (defects only) or `Effect.catchCause` (typed failures + defects + interruptions together).
- **Expose errors as values** instead of catching: `Effect.result` → `Effect<Result<A, E>, never, R>` (typed failures only); `Effect.exit` → `Effect<Exit<A, E>, never, R>` (also carries defects/interruptions — use when you need the full outcome, e.g. at a program boundary).
- **Retry / timeout** — `Effect.retry` with a `Schedule` (e.g. `Schedule.recurs(3)`) for transient failures, never for permanent ones; defects and interruptions are never retried. `Effect.timeout(duration)` races an effect, failing with a typed `TimeoutError`; use `Effect.timeoutOrElse` for a fallback value/error instead of failing.
- **Validation / accumulation** — `Effect.all`/`Effect.forEach` fail fast. Use `Effect.validate` to run every element and collect all errors, or `Effect.partition` to get `[failures, successes]` without failing at all, when every input must be evaluated (e.g. form validation).
- **Observe without altering the outcome** — `Effect.tapError`, `Effect.tapErrorTag`, `Effect.tapCause`, `Effect.tapDefect` for logging/telemetry; don't catch-and-rethrow just to log.
- Avoid `Effect.ignoreCause` (silently hides defects) except deliberately at a boundary.

## Context and dependencies (services, layers)

Functions that need a service declare it in `R` instead of threading it through arguments or reaching a singleton.

- **Define a service** as a class keyed by a unique string tag, shape typed with `Requirements = never` — dependencies belong in the layer that builds it, not in the service's own methods:
  ```ts
  class Random extends Context.Service<Random, { readonly next: Effect.Effect<number> }>("MyRandomService") {}
  ```
- **Use it** with `yield* Random` inside `Effect.gen` — this adds `Random` to the effect's `R`.
- **Build implementations with a `Layer`**, not inline `Effect.provideService`, once construction has its own dependencies:
  - `Layer.succeed(Tag, impl)` — no dependencies.
  - `Layer.effect(Tag, effect)` — effectful construction that may itself `yield*` other services (`Layer<Tag, E, R>`, `R` = what it still needs).
  - Compose with `Layer.provide(dep)` (feed one layer's output into another's input, dropping `dep`'s own output) or `Layer.provideMerge(dep)` (same, but keeps `dep`'s output too) or `Layer.merge(a, b)` (union, no resolution).
  - Discharge a fully-resolved graph (`RequirementsIn = never`) onto a program with `Effect.provide(program, layer)`, at the edge alongside where you run the effect.
- **Layers memoize by reference equality**, not structural equality: call a layer-producing factory once and reuse the value, or it builds twice. `Layer.fresh(layer)` opts a specific layer out of memoization when a use site genuinely needs a fresh instance.
- **Default services** (`Clock`, `ConfigProvider`, `Console`, `Random`, `Tracer`) are auto-available — using them doesn't add to `R`. Override with `Effect.provideService` (or a module helper like `Random.withSeed("seed")`) for determinism in tests.

## Resource management (Scope, acquire/release)

- **`Effect.acquireUseRelease(acquire, use, release)`** — the default shape for a resource scoped to one call site (DB query, single request): acquire, use, and `release` always runs after, on success, failure, or interruption.
- **`Effect.acquireRelease(acquire, release)`** — for a resource whose lifetime spans more than one call. Produces `Effect<A, E, Scope>`; must be run under `Effect.scoped(...)`, which provides and then closes a `Scope`, firing all registered finalizers. `acquire` is uninterruptible (no half-acquired leaks); `release` receives the surrounding `Exit` so cleanup can differ by outcome (e.g. roll back only on failure).
- **Finalizers run LIFO** and **on interruption too**, not just success/failure — this is the core resource-safety guarantee. Several scoped resources acquired inside the same `Effect.scoped(...)` share one merged scope by default; split with explicit `Scope.make()` + `Scope.provide(scope)` only when resources need independent release timing.
- **Lighter-weight cleanup**: `Effect.ensuring(finalizer)` (always runs, no access to outcome), `Effect.onExit(f)` (full `Exit`, uninterruptible), `Effect.onError(f)` (failure `Cause` only, uninterruptible).
- Prefer these over hand-rolled `try`/`finally` — they're the difference between cleanup that's guaranteed under interruption and cleanup that silently isn't.

## Gotchas

- **Lazy vs eager**: `Effect.succeed(i++)` runs the side effect at construction. Use `Effect.suspend(() => effect)` to defer per-invocation, to break recursion (deep recursion → stack overflow), and to unify a union return type.
- **Type narrowing**: after `yield* Effect.fail(...)` inside `gen`, TypeScript still thinks later code is reachable — `return yield* Effect.fail(...)` to narrow.
- **Option/Result interop**: `Option<A>` reads as `Effect<A, NoSuchElementError>`; `Result<A, E>` reads as `Effect<A, E>`. Errors join a union.

## Verification

Run `tsc --noEmit` (needs `"strict": true`). Common failure modes in Effect code are type-level: unhandled error channel (`E` not `never`), missing `Requirements` (`R` not `empty`), or using `runSync` on an effect that can fail or go async.