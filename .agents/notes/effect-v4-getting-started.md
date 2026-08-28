# Effect v4 — Getting Started Guide Notes

Source: https://www.effect.website/docs/v4/getting-started/introduction (v4 rc) and the following pages in the Getting Started section.

Status: research notes, distilled from the official docs.

---

## 1. Introduction

Effect is a TypeScript library for building complex sync + async programs. Main features:

- **Concurrency** — fiber-based concurrency model, highly-scalable, low-latency.
- **Composability** — small, reusable building blocks.
- **Resource Safety** — safe acquisition/release of resources, even on failure.
- **Type Safety** — heavy use of the TS type system.
- **Error Handling** — structured, reliable errors.
- **Asynchronicity** — code reads the same whether sync or async.
- **Observability** — tracing to debug/monitor programs.

Docs are sequential: basics → advanced. Optional to read in order.

### Coding with LLMs
- Docs recommend a tight feedback loop; Effect-specific tooling:
  - `tsgo` LSP plugin (recommended "latest" implementation): https://github.com/Effect-TS/tsgo
  - Effect Playground, VS Code extension, linting rules.
- Example repo optimized for agentic coding: https://github.com/mikearnaldi/accountability

### Key links
- API reference, Playground, LLM guide blog, Effect Days.

---

## 2. Why Effect?

Problem in "typical" TS: functions that throw have no type-level signal.

```ts
const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error("Cannot divide by zero")
  return a / b
}
```

You can't tell from types that it can throw. Wrap in try/catch is a band-aid.

### The Effect pattern (the core insight)
Use the type system to track **errors** and **context**, not only **success** values.

```ts
const divide = (a: number, b: number): Effect.Effect<number, Error, never> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

Effect.runSync(divide(4, 2)) // => 2
```

Errors become values, not throws. Signature shows: success type, error type, required context (`never` = none).

Tracking context lets you inject dependencies (e.g. swap real services for mocks in tests) without changing core logic.

- Don't reinvent the wheel: Effect provides standardized solutions for error handling, debugging, tracing, async, retries, streaming, concurrency, caching, resource management — under one umbrella instead of many deps.
- Inspired by Scala/Haskell, but practical and TypeScript-first.
- You don't have to use it all at once; pick pieces.

---

## 3. Installation

Requirements:
- **TypeScript 5.9+** (TS 7 recommended).
- Node.js, Deno, or Bun.

### Node.js
```bash
mkdir hello-effect && cd hello-effect
npm init -y
npm install --save-dev typescript
npx tsc --init
```
Ensure `tsconfig.json` has `"strict": true`. Install:
```bash
npm install effect@rc
```
Write `src/index.ts`:
```ts
import { Effect, Console } from "effect"

const program = Console.log("Hello, World!")
const result = Effect.runSync(program)
```
Run with `npx tsx src/index.ts`.

### Deno
```sh
deno init
deno add npm:effect@rc
deno run main.ts
```

### Bun
```bash
bun init
# ensure strict: true
bun add effect@rc
bun index.ts
```

### Vite + React
Scaffold `react-ts` template, `npm install`, ensure `strict: true`, `npm install effect@rc`. Wire a counter with `Effect.sync` + `Effect.runSync`.

Key takeaway: package is `effect@rc` (v4 release candidate), `"strict": true` required.

---

## 4. The Effect Type

`Effect` is a **lazy** description of a workflow/operation. Creating it does not run it.

```
Effect<Success, Error, Requirements>
```

Conceptually like:
```ts
type Effect<Success, Error, Requirements> = (
  context: Context<Requirements>,
) => Error | Success
```
But effects are not functions — they can model sync, async, concurrent, resourceful computations.

- **Immutable** — every library function produces a new Effect.
- **Model, don't act** — values only describe interactions.
- **Execution** — via the Runtime System, ideally at a single entry point (e.g. `main`).

### Type parameters (abbreviated `A`, `E`, `R`)
| Param | Meaning | Notes |
|---|---|---|
| **Success (A)** | value on success | `void` = no useful info; `never` = runs forever (or until failure) |
| **Error (E)** | expected errors | `never` = cannot fail |
| **Requirements (R)** | contextual data needed | stored in `Context`; `never` = none |

### Extract inferred types
- `Effect.Success<typeof program>`
- `Effect.Error<typeof program>`
- `Effect.Services<typeof program>`

```ts
class SomeContext extends Context.Service<SomeContext, {}>()("SomeContext") {}
declare const program: Effect.Effect<number, Error, SomeContext>
type A = Effect.Success<typeof program> // number
type E = Effect.Error<typeof program>    // Error
type R = Effect.Services<typeof program> // SomeContext
```

---

## 5. Creating Effects

### Why not throw?
Thrown exceptions are invisible to the type system. Effect uses explicit success/failure constructors.

### succeed
Always succeeds with a value. `Effect.succeed(42)` → `Effect<number, never, never>`.

### fail
Recoverable error. `Effect.fail(new Error("..."))` → `Effect<never, Error, never>`. Can be strings, numbers, objects.

**Tagged errors** (good practice — object with `_tag`), works with `Effect.catchTag`:
```ts
class HttpError extends Data.TaggedError("HttpError")<{}> {}
const program = Effect.fail(new HttpError())
```

### Error tracking — example
```ts
const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0 ? Effect.fail(new Error("Cannot divide by zero")) : Effect.succeed(a / b)
```

### Modeling synchronous effects (thunks)
- `Effect.sync(() => ...)` — sync side effect guaranteed not to throw. A throw is treated as a **defect** (not standard error), catchable with `Effect.catchDefect`.
- `Effect.try(() => ...)` — sync that might fail. Throws → captured as `UnknownError`. Overload to remap:
  ```ts
  Effect.try({
    try: () => JSON.parse(input),
    catch: (unknown) => new Error(`something went wrong ${unknown}`),
  })
  ```

### Modeling asynchronous
- `Effect.promise(() => Promise)` — guaranteed to resolve. Rejection = defect.
- `Effect.tryPromise(() => fetch(...))` — might reject. Default error `UnknownError`. Overload with `{ try, catch }` to remap.

### From a callback
`Effect.callback<A, E>((resume) => { ... })` — wrap callback-style APIs. `resume(Effect.succeed(...))` or `resume(Effect.fail(...))`. Call `resume` exactly once; extra calls ignored.
- May return a cleanup effect that runs on interruption (fiber cancelled).
- `resume` can accept an `AbortSignal` as 2nd arg for interruptible operations.

### Suspended effects (Effect.suspend)
Defer creation of an effect: `Effect.suspend(() => effect)`. Use for:
- **Lazy evaluation** / re-execution per invocation (vs eager `Effect.succeed(i++)`).
- **Circular dependencies** / recursion (avoids stack overflow — e.g. Fibonacci).
- **Unifying return types** — when a function returns `Effect<...> | Effect<...>`, wrap in suspend to unify.

### Constructors cheatsheet
| API | Given | Result |
|---|---|---|
| `succeed` | `A` | `Effect<A>` |
| `fail` | `E` | `Effect<never, E>` |
| `sync` | `() => A` | `Effect<A>` |
| `try` | `() => A` | `Effect<A, UnknownError>` |
| `try` (overload) | `() => A`, `unknown => E` | `Effect<A, E>` |
| `promise` | `() => Promise<A>` | `Effect<A>` |
| `tryPromise` | `() => Promise<A>` | `Effect<A, UnknownError>` |
| `tryPromise` (overload) | `() => Promise<A>`, `unknown => E` | `Effect<A, E>` |
| `callback` | `(Effect<A,E>=>void)=>void` | `Effect<A, E>` |
| `suspend` | `() => Effect<A,E,R>` | `Effect<A,E,R>` |

---

## 6. Running Effects

Design: most logic as Effects; call `run*` at the **edge** of your program.

### runSync
Synchronous, immediate. Throws if effect fails or does async work (async → `AsyncFiberError` defect).

### runSyncExit
Runs synchronously, returns an `Exit<A, E>` (Success/Failure). Async effect → `Failure` with a `Die` cause.

### runPromise
Returns `Promise<A>`; resolves on success, rejects on failure.

### runPromiseExit
Returns `Promise<Exit<A, E>>` — outcome including defects.

### runFork
The foundational runner — starts a **fiber** that can be observed/interrupted. **Default choice** unless you need Promise/sync.
```ts
const fiber = Effect.runFork(program)
// later: Effect.runFork(Fiber.interrupt(fiber))
```

### Sync vs async
There's no built-in way to tell in advance if an effect runs sync or async — tracking it would add complexity and not really improve safety. So:
- Default to `runPromise` / `runFork`.
- Use `runSync` only when needed (purely sync, immediate).

### run* cheatsheet
| API | Given | Result |
|---|---|---|
| `runSync` | `Effect<A,E>` | `A` |
| `runSyncExit` | `Effect<A,E>` | `Exit<A,E>` |
| `runPromise` | `Effect<A,E>` | `Promise<A>` |
| `runPromiseExit` | `Effect<A,E>` | `Promise<Exit<A,E>>` |
| `runFork` | `Effect<A,E>` | `RuntimeFiber<A,E>` |

---

## 7. Using Generators (Effect.gen)

Optional but common. Reads like `async`/`await`:
- Wrap logic in `Effect.gen(function* () { ... })`
- `yield*` effects
- `return` the result

**TS config**: generators need `"downlevelIteration"` or `target: "es2015"`+.

```ts
const program = Effect.gen(function* () {
  const transactionAmount = yield* fetchTransactionAmount
  const discountRate = yield* fetchDiscountRate
  const discountedAmount = yield* applyDiscount(transactionAmount, discountRate)
  return `Final amount to charge: ${discountedAmount}`
})
```

### Behavior
- If any `yield*`'d effect fails, generator stops and exits with that failure (**short-circuiting**).
- Can use normal control flow (`if`/`else`, `for`, `while`) inside.
- To not stop on error, use `Effect.result` to wrap the error in a `Result`.
- **Type narrowing gotcha:** after `yield* Effect.fail(...)`, TS still thinks the code below is reachable — explicitly `return yield* Effect.fail(...)` to narrow.

### this binding
Pass `this` via overload: `Effect.gen({ self: this }, function* () { ... })`.

---

## 8. Building Pipelines

### Why pipelines
Readability, code organization, reusability, type safety.

### Functions vs methods
Effect uses **functions** (not methods) for:
- **Tree shakeability** — bundlers can eliminate unused functions; methods can't be tree-shaken.
- **Extensibility** — extend by plain functions instead of prototype patching.

### pipe
```ts
import { pipe } from "effect"
const result = pipe(input, func1, func2, ..., funcN)
```
Functions must take a single argument. Left-to-right composition.

### map
`pipe(myEffect, Effect.map(f))` — transform success value. Immutable.

### as
Replace value with a constant: `Effect.as("new value")`.

### flatMap
Chain effects where each step returns an Effect. `Effect.flatMap(f)` where `f: A => Effect<B, ...>`. 
- **Gotcha:** don't ignore effects inside the callback — chain explicitly (`map`/`flatMap`/`andThen`/`tap`).

### andThen
Chain two actions where the 2nd can depend on 1st's result. 2nd arg can be an `Effect` or a function returning an `Effect`. If just transforming to a plain value, use `map` instead.
- Works with `Option`/`Result` (they implement `Yieldable`): `Option<A>` → `Effect<A, NoSuchElementError>`; `Result<A,E>` → `Effect<A,E>`. Errors combine into a union.

### tap
Run a side effect with the value, **without changing** it. Like flatMap but ignores result. If the side effect fails, whole chain fails. Great for logging/observing.

### all
Combine multiple effects → tuple / struct / record / iterable result. Runs **sequentially by default**; short-circuits on first error. `{ mode: "result" }` runs all and collects `Result`s.

### Example pipeline
```ts
const program = pipe(
  Effect.all([fetchTransactionAmount, fetchDiscountRate]),
  Effect.andThen(([amount, rate]) => applyDiscount(amount, rate)),
  Effect.map(addServiceCharge),
  Effect.map((final) => `Final amount: ${final}`),
)
```

### .pipe method
`effect.pipe(func1, ..., funcN)` is equivalent to `pipe(effect, func1, ...)`; avoids importing `pipe`.

### Cheatsheet
| API | Input | Output |
|---|---|---|
| `map` | `Effect<A,E,R>`, `A => B` | `Effect<B,E,R>` |
| `flatMap` | `Effect<A,E,R>`, `A => Effect<B,E,R>` | `Effect<B,E,R>` |
| `andThen` | `Effect<A,E,R>`, `Effect<B,E,R> \| A => Effect<B,E,R>` | `Effect<B,E,R>` |
| `tap` | `Effect<A,E,R>`, `A => Effect<B,E,R>` | `Effect<A,E,R>` |
| `all` | `[Effect<A>, Effect<B>, ...]` | `Effect<[A,B,...]>` |

---

## 9. Control Flow Operators

### if/then/else
Use plain JS `if`; branch into `Effect.succeed` / `Effect.fail`. Example uses `Option` for absence of value vs error channel for failures.

### Conditional: when
`myEffect.pipe(Effect.when(conditionEffect))` — runs only if condition effect is `true`. Result wrapped in `Option<A>` (`Some` if run, `None` if skipped).
```ts
const randomIntOption = Random.nextInt.pipe(Effect.when(Random.nextBoolean))
```

### Zipping
- `Effect.zip(a, b)` → `Effect<[A, B]>`. Sequential by default; `{ concurrent: true }` to run in parallel.
- `Effect.zipWith(a, b, f)` → `Effect<C>`, combines results via `f`.

### Looping
- `Effect.whileLoop(initial, { while, step, body })` — collect states into array; `discard: true` → void.
  (Example uses a plain `while` inside `Effect.gen` instead — same idea.)
- `Effect.forEach(iterable, (n, index) => effect)` — apply effect per element, return array of results. `discard: true` → void. `concurrency` option.

### Collecting: all
- Tuples/iterables/structs/records all supported.
- Default **short-circuits** on first failure.
- `{ mode: "result" }` — run all, collect `Result`s (successes + failures) without stopping.

---

## Quick reference — most common APIs used in the guide
- Construct: `Effect.succeed`, `Effect.fail`, `Effect.sync`, `Effect.try`, `Effect.promise`, `Effect.tryPromise`, `Effect.callback`, `Effect.suspend`, `Effect.gen`, `Effect.all`, `Effect.void`
- Compose: `pipe`, `Effect.map`, `Effect.flatMap`, `Effect.andThen`, `Effect.tap`, `Effect.zip`, `Effect.zipWith`, `Effect.forEach`, `Effect.when`, `Effect.whileLoop`, `Effect.as`
- Run: `Effect.runSync`, `Effect.runSyncExit`, `Effect.runPromise`, `Effect.runPromiseExit`, `Effect.runFork`
- Types: `Effect.Success`, `Effect.Error`, `Effect.Services`, `Exit`, `Option`, `Result`, `Context.Service`, `Data.TaggedError`
- Interop: `Effect.fromOption`, `Effect.fromResult`

## Conventions to follow when writing Effect code
- Prefer functions (tree-shakeable/extensible) over methods.
- Compose with `pipe` or `.pipe`.
- Prefer tagged errors (`Data.TaggedError`) for catchable expected errors.
- Run effects at the edge of the program (`main`).
- Wrap risky sync/async in `try`/`tryPromise`; remap errors to domain types.
- Use `Effect.suspend` for recursion / laziness / type unification.