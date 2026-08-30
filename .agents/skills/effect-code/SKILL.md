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
4. Regions fenced with `<!-- repo-finding: ... -->` came from this repo's review findings, not from the source notes. Preserve them verbatim, never count them toward a topic's coverage, and retire one only by editing its row in the state file's Repo findings registry. Write around a fence; don't restate what it already says.
5. Report which topic was picked, why (its gap number vs. the runner-up), and the new coverage score — the state file is the memory, so nothing else needs to persist across runs.

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
- `Effect.all([a, b])` — combine into tuple/struct/record. **Sequential by default** — pass `{ concurrency }` explicitly, see [Performance](#performance). Short-circuits on first error; `{ mode: "result" }` runs all and collects `Result`s.
- `Effect.zip(a, b)` / `Effect.zipWith(a, b, f)` — combine exactly two effects into a tuple, or via `f`. Sequential unless `{ concurrent: true }`.
- `Effect.when(conditionEffect)` — run only if an effect-valued condition is `true`; result is `Option<A>` (`None` = skipped).
- `Effect.forEach(iterable, f)` — one effect per element, collecting results; `{ discard: true }` to throw the array away, `{ concurrency }` as with `Effect.all`.
- `Effect.whileLoop(initial, { while, step, body })` — state-driven loop when you're in a pipeline. Inside `Effect.gen`, a plain `while` with `yield*` reads better and is what the docs actually reach for.

`myEffect.pipe(fn1, fn2)` is equivalent to `pipe(myEffect, fn1, fn2)` and needs no import.

Most operators are **dual**: data-last (`Effect.map(f)`) composes inside `pipe`; data-first (`Effect.map(effect, f)`) applies directly. Identical results — same function, dispatched on argument shape. Use data-last in a multi-step pipeline, data-first for a single standalone call.

```ts
pipe(effect, Effect.map(f1), Effect.map(f2)) // data-last
Effect.map(effect, f)                        // data-first
```

- **Generators** — `Effect.gen(function* () { const x = yield* someEffect; ... return value })`. Reads like `async`/`await`, allows `if`/`for`/`while`. Needs `target: "es2015"`+ or `downlevelIteration`. `yield*` short-circuits on the first failing effect.

Either works. The failing step stops the program at the first error in both spellings.

**When steps depend on each other, don't nest `pipe`.** Chained `Effect.andThen` callbacks pyramid one level per step. Two ways out, in the docs' order of preference:

```ts
// "do simulation" — flat, stays in pipeline style
Effect.Do.pipe(
  Effect.bind("start", () => now),          // bind: runs an effect, adds the result to the scope
  Effect.bind("result", () => self),
  Effect.let("elapsed", ({ start }) => Date.now() - start), // let: adds a plain derived value
  Effect.tap(({ elapsed }) => Console.log(`Elapsed: ${elapsed}`)),
  Effect.map(({ result }) => result),
)

// Effect.gen — "the most concise and convenient solution" per the docs
Effect.gen(function* () {
  const start = yield* now
  const result = yield* self
  console.log(`Elapsed: ${Date.now() - start}`)
  return result
})
```

Reach for `Effect.Do` only in a region that is deliberately all-pipeline; otherwise `Effect.gen`.

## Running at the edge

Run effects at the edge of the program, not scattered through it.

| | Use |
|---|---|
| `Effect.runSync(e)` | purely synchronous, immediate result |
| `Effect.runPromise(e)` | async, returns `Promise<A>` |
| `Effect.runPromiseExit(e)` | async, returns `Promise<Exit<A, E>>` (see failures/defects) |
| `Effect.runFork(e)` | run in background on a fiber (default choice) |

`runSync` throws on a failing or async effect — don't use it where either can occur.

At the **true top level of an application**, prefer the platform `runMain` over a bare `runFork`/`runPromise`. It observes the root fiber and interrupts every fiber on `SIGINT`, so finalizers actually run on Ctrl+C; teardown logic must live inside the main effect for that to hold.

| Platform | Entry point | Package |
|---|---|---|
| Node.js | `NodeRuntime.runMain` | `@effect/platform-node` |
| Bun | `BunRuntime.runMain` | `@effect/platform-bun` |
| Browser | `BrowserRuntime.runMain` | `@effect/platform-browser` |

```ts
NodeRuntime.runMain(program) // graceful teardown; Effect.runPromise(program) has none
```

<!-- repo-finding: electron-runmain-exception -->

**Exception in an Electron app.** Electron owns its own lifecycle (`app.whenReady()`, `app.on("window-all-closed")`), so wrapping it in a platform runtime adds a dependency for no gain. There the correct single-edge pattern is one `Effect.runPromise` in the entry module, called from `app.whenReady()`, with every other module returning `Effect` and never running anything. Decided in `.agents/notes/implemented/architecture/2026-08-29-entry-point-edge-boundary.md`; don't "fix" it toward `runMain`.

<!-- /repo-finding -->

## Branding domain types

TypeScript is structural, so `type UserId = string` and `type ProductId = string` are the same type and swapping them is not an error. A brand intersects a unique marker so the compiler treats them as distinct; the runtime representation is unchanged.

| Constructor | Runtime check | Use for |
|---|---|---|
| `Brand.nominal<T>()` | none — brands and returns the value as-is | identifiers that only need a distinct identity |
| `Brand.make<T>(predicate)` | validates, **throws** `BrandError` | validated primitives (positive, non-empty, well-formed) |
| `Brand.all(A, B)` | every combined constraint | one type carrying several validations |

```ts
type UserId = string & Brand.Brand<"UserId">
const UserId = Brand.nominal<UserId>()

type Int = number & Brand.Brand<"Int">
const Int = Brand.make<Int>((n) => Number.isInteger(n) || `Expected ${n} to be an integer`)

const PositiveInt = Brand.all(Int, Positive)
type PositiveInt = Brand.Brand.FromConstructor<typeof PositiveInt>
```

- The constructor **throws** by default. Non-throwing alternatives hang off it: `Int.option(x)`, `Int.result(x)`, `Int.is(x)`.
- Direct assignment is rejected too — `const x: Int = 3` is a compile error, not just a runtime one. `Brand.Brand.FromConstructor<typeof C>` is how you name a combined type; there's no separate declaration to write.
- Brand identifiers, validated primitives, and anything else where two same-shaped values mean different things. A pair of adjacent same-typed parameters is the signal.

<!-- repo-finding: schema-brand-over-brand-module -->

**When the value already crosses a `Schema` decode, brand the schema instead.** `Schema.String.pipe(Schema.brand("SaveId"))` makes decoding itself the minting operation, so payloads arrive branded with no hand-construction on the happy path. It is nominal — it narrows the type and adds no runtime check. It also leaves the *constructor* input unbranded (`~type.make.in` stays `string`), so `new SomeView({ id: row.id })` still compiles while enforcement lands on the read side, which is where transposed-argument bugs actually live. A separate `Brand.nominal` constructor sitting beside the schema is the thing to avoid. See `.agents/notes/implemented/architecture/2026-08-29-branded-domain-ids.md`.

<!-- /repo-finding -->

## Branching with Match

`effect/Match` is the type-safe alternative to long `if`/`else` or `switch` chains, and the reason to reach for it over a `switch` is `Match.exhaustive`. Three steps: build a matcher, add patterns, finalize.

```ts
const describe = Match.type<Event>().pipe(
  Match.tag("fetch", "success", () => "Ok!"),        // multiple tags per branch
  Match.tag("error", (e) => `Error: ${e.error.message}`),
  Match.tag("cancel", () => "Cancelled"),
  Match.exhaustive,                                   // compile error if a case is missing
)
```

| Step | API |
|---|---|
| build | `Match.type<T>()` (returns a function) · `Match.value(x)` (matches immediately) |
| pattern | `Match.when(pattern, f)` — literal, object shape, or predicate · `Match.not(value, f)` · `Match.tag("a", "b", f)` |
| finalize | `Match.exhaustive` · `Match.orElse(f)` · `Match.option` → `Option` · `Match.result` → `Result` |

- Built-in predicates for `Match.when`: `Match.string`, `Match.nonEmptyString`, `Match.number`, `Match.boolean`, `Match.bigint`, `Match.symbol`, `Match.date`, `Match.record`, `Match.null`, `Match.undefined`, `Match.defined`, `Match.any`, `Match.instanceOf(Class)`, `Match.is(...literals)`.
- **`Match.withReturnType<T>()` must be the first instruction in the pipeline.** Later, it still compiles and silently stops enforcing anything — a pitfall worth checking whenever branch return types drift.
- `Match.tag` is hard-wired to the `"_tag"` discriminant, which is what `Data.TaggedError` and the tagged data types below already use. A union discriminated on any other field needs `Match.when` with a shape pattern.
- `Match.result`'s failure carries the **unmatched input** (`Result.fail(input)`), not a "no match" marker.
- A `switch` on `_tag` where every case returns is already exhaustiveness-checked by TypeScript; `Match` earns its import when you want a value-producing expression, non-`_tag` patterns, or an `Option`/`Result` finalizer. A `switch` with a `default:` branch, however, is not checked at all — that's the case to replace.

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

## Performance

<!-- repo-finding: performance-judgement -->

Effect's defaults favour predictability over speed. Each of these is a per-call-site judgement the type checker cannot make for you.

- **Concurrency is opt-in, and the default is sequential.** `Effect.all` and `Effect.forEach` run one item at a time unless given `{ concurrency }`. Choose deliberately: pure CPU work (schema decoding, arithmetic over an in-memory array) gains nothing and should say `{ concurrency: 1 }`; work that does IO per item is where concurrency pays, and should be bounded to what the downstream resource tolerates. Reserve `"unbounded"` for collections whose size you control. `effect-lint`'s `require-explicit-concurrency` rule requires the option to be present — it cannot tell you which value is right.
- **A sequential `yield*` chain is a concurrency decision too.** `const a = yield* fetchA; const b = yield* fetchB` runs serially even when `b` does not depend on `a`. Independent effects belong in one `Effect.all([fetchA, fetchB], { concurrency: 2 })`.
- **`Effect.gen` allocates a generator per invocation.** Fine at the top of a workflow; wasteful as the per-item callback of a large `forEach` or inside a hot loop. Prefer a `map`/`flatMap` pipeline there, or hoist the `gen` out of the loop so it's constructed once.
- **Don't rebuild what you can reuse.** Repeated identical effects want `Effect.cached` (or `Effect.cachedFunction` when keyed); N+1 fetches inside a `forEach` want a batched `RequestResolver` rather than a higher concurrency number. Raising concurrency to paper over an N+1 makes the load worse, not better.
- **Layers memoize by reference** — see the services section. A layer-producing factory called twice builds its dependency graph twice; this shows up as duplicate connections and doubled startup cost, not as a type error.

<!-- /repo-finding -->

## Gotchas

- **Lazy vs eager**: `Effect.succeed(i++)` runs the side effect at construction. Use `Effect.suspend(() => effect)` to defer per-invocation, to break recursion (deep recursion → stack overflow), and to unify a union return type.
- **Type narrowing**: after `yield* Effect.fail(...)` inside `gen`, TypeScript still thinks later code is reachable — `return yield* Effect.fail(...)` to narrow.
- **Option/Result interop**: `Option<A>` reads as `Effect<A, NoSuchElementError>`; `Result<A, E>` reads as `Effect<A, E>`. Errors join a union.
- **No tacit (point-free) callbacks**: write `Effect.map((x) => fn(x))`, not `Effect.map(fn)`, and avoid `flow` from `effect/Function`. Passing a bare reference can erase generics when the target has overloads or optional parameters, weakens inference at the call site, and costs you a named stack frame. The lambda is the whole fix.

## Verification

Run `tsc --noEmit` (needs `"strict": true`). Common failure modes in Effect code are type-level: unhandled error channel (`E` not `never`), missing `Requirements` (`R` not `empty`), or using `runSync` on an effect that can fail or go async.

<!-- repo-finding: tooling-verification -->

Type checking is necessary but not sufficient — the performance defaults above are all type-correct. Where a repo carries the `effect-lint` script and the `@effect/language-service` plugin, run those too: the linter catches the mechanical cases (missing `concurrency`, `Effect.ignore`, nested `Layer.provide`), the language service catches the type-aware ones (floating effects, leaking requirements, errors missing from `E`). What neither can catch is the judgement in each Performance bullet — which concurrency value, whether a `gen` belongs in that loop.

<!-- /repo-finding -->