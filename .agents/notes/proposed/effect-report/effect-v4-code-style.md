# Effect v4 — Code Style Notes

Source: https://www.effect.website/docs/v4/code-style/guidelines (v4 rc) and the following pages in the Code Style section: `dual`, `branded-types`, `pattern-matching`, `do`, `control-flow`.

Status: research notes, distilled from the official docs.

See also `.agents/skills/effect-code/SKILL.md` for the core `Effect<A, E, R>` conventions (construction, running, gen vs pipelines) — this file complements it with style-specific guidance and does not re-explain the basics.

---

## 1. Guidelines

Two headline rules from the guidelines page.

### Use `runMain` as the entry point
On Node.js (and other platforms), run the whole program through the platform's `runMain` rather than `Effect.runPromise`/`runFork` directly at the top level. `runMain` finds and interrupts all fibers, and listens for `SIGINT` so `Ctrl+C` triggers a graceful shutdown (finalizers run).

```ts
import { Effect, Console, Schedule, pipe } from "effect"
import { NodeRuntime } from "@effect/platform-node"

const program = pipe(
  Effect.addFinalizer(() => Console.log("Application is about to exit!")),
  Effect.andThen(Console.log("Application started!")),
  Effect.andThen(
    Effect.repeat(Console.log("still alive..."), {
      schedule: Schedule.spaced("1 second"),
    }),
  ),
  Effect.scoped,
)

NodeRuntime.runMain(program)
```

Platform variants: `NodeRuntime.runMain` (`@effect/platform-node`), `BunRuntime.runMain` (`@effect/platform-bun`), `BrowserRuntime.runMain` (`@effect/platform-browser`). This refines the "run at the edge" convention already in the effect-code skill — at the true top level, prefer the platform `runMain`, not `runFork`/`runPromise`.

### Avoid tacit (point-free) usage
Don't pass a bare function reference where a lambda is expected; wrap it explicitly.

```ts
// Preferred
Effect.map((x) => fn(x))

// Avoid
Effect.map(fn)
```

Rationale: tacit usage can silently erase types when the passed function has overloads or optional parameters, it weakens TypeScript's inference at the call site, and it degrades stack traces (the wrapping lambda gives a named frame).

---

## 2. Dual APIs (`dual`)

Many Effect functions ship two calling conventions — "data-last" and "data-first" — for the same underlying operation.

**Data-last** — the primary data argument comes last. This is the shape that composes with `pipe`:
```ts
<A, B>(f: (a: A) => B): <E, R>(self: Effect<A, E, R>) => Effect<B, E, R>
```
```ts
const mappedEffect = pipe(effect, Effect.map(func))
pipe(effect, Effect.map(func1), Effect.map(func2), ...)
```

**Data-first** — the primary data argument comes first, so the call applies directly without `pipe`:
```ts
<A, E, R, B>(self: Effect<A, E, R>, f: (a: A) => B): Effect<B, E, R>
```
```ts
const mappedEffect = Effect.map(effect, func)
```

Both forms produce identical results — they're the same function, dispatched by arity/argument shape. Use data-last inside a pipeline of several transformations; use data-first for a single, standalone application where it reads more directly. Pick per call site based on readability, not a hard rule.

Note: the fetched page describes the calling-convention distinction and overload shapes but does not show the internal `dual()` helper implementation (arity dispatch) — that's an implementation detail of how Effect itself defines these functions, not something you typically need when just calling the library.

---

## 3. Branded Types

TypeScript is structurally typed, so `type UserId = number` and `type ProductId = number` are interchangeable — nothing stops you from passing a `ProductId` where a `UserId` is expected. Branding fixes this by tagging a type with a unique marker so the compiler treats it as distinct, even though the runtime representation is unchanged.

Conceptually:
```ts
const BrandTypeId: unique symbol = Symbol.for("effect/Brand")

interface Brand<in out ID extends string | symbol> {
  readonly [BrandTypeId]: {
    readonly [id in ID]: ID
  }
}

type ProductId = number & Brand<"ProductId">
type UserId = number & Brand<"UserId">
```

### `Brand.nominal` — no runtime check
Pure type-level distinction; use when the value doesn't need validation, just a distinct identity.
```ts
type UserId = number & Brand.Brand<"UserId">
const UserId = Brand.nominal<UserId>()
```

### `Brand.make` — with runtime validation
Constructor validates and throws `BrandError` on invalid input.
```ts
type Int = number & Brand.Brand<"Int">
const Int = Brand.make<Int>(
  (n) => Number.isInteger(n) || `Expected ${n} to be an integer`
)
```

### `Brand.all` — combine multiple brands
```ts
const PositiveInt = Brand.all(Int, Positive)
```
Produces a single constructor that enforces every combined constraint.

Use branded types for domain identifiers and validated primitives (IDs, positive counts, non-empty strings, emails) to prevent accidental mixups that the structural type system alone won't catch.

---

## 4. Pattern Matching (`effect/Match`)

The `Match` module is a type-safe alternative to `if`/`else` chains and `switch`, especially for discriminated unions. Three-step shape: build a matcher, add patterns, finalize.

### Building a matcher
By type:
```ts
const match = Match.type<string | number>().pipe(
  Match.when(Match.number, (n) => `number: ${n}`),
  Match.when(Match.string, (s) => `string: ${s}`),
  Match.exhaustive,
)

match(0)       // => "number: 0"
match("hello") // => "string: hello"
```

By value (matches immediately against a concrete value):
```ts
const input = { name: "John", age: 30 }
const result = Match.value(input).pipe(
  Match.when({ name: "John" }, (user) => `${user.name} is ${user.age} years old`),
  Match.orElse(() => "Oh, not John"),
)
// => "John is 30 years old"
```

Enforce a return type across all branches with `Match.withReturnType<T>()`:
```ts
const match = Match.type<{ a: number } | { b: string }>().pipe(
  Match.withReturnType<string>(),
  Match.when({ b: Match.string }, (_) => _.b),
  Match.exhaustive,
)
```

### Combinators
- **`Match.when`** — pattern can be a literal value, a shape (partial object with predicates/values per field), or a predicate function.
  ```ts
  const match = Match.type<{ age: number }>().pipe(
    Match.when({ age: (age) => age > 18 }, (user) => `Age: ${user.age}`),
    Match.when({ age: 18 }, () => "You can vote"),
    Match.orElse((user) => `${user.age} is too young`),
  )
  ```
- **`Match.not`** — matches everything except the given value.
  ```ts
  const match = Match.type<string | number>().pipe(
    Match.not("hi", () => "ok"),
    Match.orElse(() => "fallback"),
  )
  ```
- **`Match.tag`** — matches on a discriminated union's `_tag` field; accepts multiple tags per branch.
  ```ts
  type Event =
    | { readonly _tag: "fetch" }
    | { readonly _tag: "success"; readonly data: string }
    | { readonly _tag: "error"; readonly error: Error }
    | { readonly _tag: "cancel" }

  const match = Match.type<Event>().pipe(
    Match.tag("fetch", "success", () => `Ok!`),
    Match.tag("error", (event) => `Error: ${event.error.message}`),
    Match.tag("cancel", () => "Cancelled"),
    Match.exhaustive,
  )
  ```
  This pairs naturally with `Data.TaggedError`/tagged data types from the effect-code skill's error conventions — same `_tag` discriminant, used here for exhaustive branching instead of catching.

### Built-in predicates
`Match.string`, `Match.number`, `Match.boolean`, `Match.bigint`, `Match.symbol`, `Match.date`, `Match.null`, `Match.undefined`, `Match.defined`, `Match.any`, `Match.instanceOf(Class)`, `Match.is(...values)`.

### Finalizers
| Finalizer | Behavior |
|---|---|
| `Match.exhaustive` | Requires every case handled; TS compile error if a case is missing. |
| `Match.orElse` | Fallback function for anything unmatched. |
| `Match.option` | Wraps the result in `Option` (`Some`/`None`). |
| `Match.result` | Wraps the result in `Result` (`Success`/`Failure`). |

---

## 5. "Do" Notation / Avoiding Excessive Nesting

Chaining several dependent effects with nested `pipe`/`andThen` calls produces a deeply indented "pyramid" that's hard to read. The docs walk through the same `elapsed` example (time a wrapped effect and log the duration) in three styles, in increasing order of recommendation.

### 1. Plain nested pipe (what to avoid)
```ts
const elapsed = <R, E, A>(
  self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  now.pipe(
    Effect.andThen((startMillis) =>
      self.pipe(
        Effect.andThen((result) =>
          now.pipe(
            Effect.andThen((endMillis) => {
              const elapsed = endMillis - startMillis
              return Console.log(`Elapsed: ${elapsed}`).pipe(
                Effect.map(() => result),
              )
            }),
          ),
        ),
      ),
    ),
  )
```
Every dependent step nests one level deeper — verbose and hard to follow.

### 2. "Do simulation" — `Effect.Do` + `Effect.bind` / `Effect.let`
Flattens the pyramid into a single pipeline. `Effect.bind("name", () => effect)` runs an effect and adds its result to an accumulating scope object; `Effect.let("name", (scope) => value)` adds a plain derived value the same way. Later steps in the pipe read the whole accumulated scope.
```ts
const elapsed = <R, E, A>(
  self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.Do.pipe(
    Effect.bind("startMillis", () => now),
    Effect.bind("result", () => self),
    Effect.bind("endMillis", () => now),
    Effect.let(
      "elapsed",
      ({ startMillis, endMillis }) => endMillis - startMillis,
    ),
    Effect.tap(({ elapsed }) => Console.log(`Elapsed: ${elapsed}`)),
    Effect.map(({ result }) => result),
  )
```

### 3. `Effect.gen` — recommended
The docs call this "the most concise and convenient solution." Same logic, linear/imperative shape via generators and `yield*` (see the effect-code skill for the full generator conventions — short-circuiting, type-narrowing gotcha, etc.).
```ts
const elapsed = <R, E, A>(
  self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    const startMillis = yield* now
    const result = yield* self
    const endMillis = yield* now
    const elapsed = endMillis - startMillis
    console.log(`Elapsed: ${elapsed}`)
    return result
  })
```

**Takeaway**: default to `Effect.gen` for multi-step dependent logic. Reach for the Do-simulation style only in codebases/regions that stay in pure pipeline style and want to avoid generators; avoid manually nesting `pipe`/`andThen` more than one level deep.

---

## 6. Control Flow Operators

Beyond plain JS `if`/`for`/`while` (usable directly inside `Effect.gen`), Effect provides dedicated operators for conditional execution, combining, and looping over effects. These mostly duplicate what's already summarized in the effect-code skill and the getting-started notes' "Control Flow Operators" section — repeated here for completeness of the code-style doc set, plus what's new.

- **`Effect.when`** — run an effect only if a condition effect evaluates `true`; result is `Option<A>` (`Some` if it ran, `None` if skipped).
  ```ts
  const randomIntOption = Random.nextInt.pipe(Effect.when(Random.nextBoolean))
  ```
- **`Effect.zip`** — combine two effects into a tuple; sequential by default, `{ concurrent: true }` for parallel.
  ```ts
  const program = Effect.zip(task1, task2)
  const program = Effect.zip(task1, task2, { concurrent: true })
  ```
- **`Effect.zipWith`** — like `zip`, but combines the two results with a function instead of returning a tuple.
  ```ts
  const task3 = Effect.zipWith(
    task1,
    task2,
    (number, string) => number + string.length,
  )
  ```
- **`Effect.whileLoop`** — repeatedly runs `body` and updates state via `step` while `while` holds.
  ```ts
  Effect.whileLoop(initial, {
    while: (state) => boolean,
    step: (state) => state,
    body: (state) => Effect,
  })
  ```
- **`Effect.forEach`** — run an effect per element of an iterable, collecting results (or discard with `{ discard: true }`); supports a `concurrency` option.
  ```ts
  const result = Effect.forEach([1, 2, 3, 4, 5], (n, index) =>
    Console.log(`Currently at index ${index}`).pipe(Effect.as(n * 2)),
  )
  ```
- **`Effect.all`** — combine effects from a tuple, iterable, struct, or record. Short-circuits on first failure by default; `{ mode: "result" }` runs everything and collects `Result`s instead of stopping.
  ```ts
  const resultsAsTuple = Effect.all(tupleOfEffects)
  const resultsAsArray = Effect.all(iterableOfEffects)
  const program = Effect.all(effects, { mode: "result" })
  ```

Note: `Effect.if`, `Effect.cond`, `Effect.filterOrFail`, and `Effect.unless` are **not** documented on this page as of this fetch — the control-flow doc's actual scope is `when`, `zip`/`zipWith`, `whileLoop`, `forEach`, and `all`. If those other operators are needed, verify current existence/signature against the API reference or source directly rather than assuming from v3 knowledge.

---

## Cheatsheet

| Topic | API / Pattern | Use for |
|---|---|---|
| Entry point | `NodeRuntime.runMain` / `BunRuntime.runMain` / `BrowserRuntime.runMain` | Top-level program execution with graceful shutdown on `SIGINT` |
| Style | `Effect.map((x) => fn(x))` not `Effect.map(fn)` | Avoid tacit/point-free usage |
| Calling convention | data-last: `Effect.map(f)` in a `pipe` | Multi-step pipelines |
| Calling convention | data-first: `Effect.map(effect, f)` | Single standalone application |
| Distinct IDs, no validation | `Brand.nominal<T>()` | Type-level-only distinction |
| Distinct IDs, validated | `Brand.make<T>(predicate)` | Runtime-checked branded values |
| Combine brand constraints | `Brand.all(BrandA, BrandB)` | Multiple validations on one type |
| Branch on type/value | `Match.type<T>()` / `Match.value(x)` + `Match.when`/`Match.not`/`Match.tag` + `Match.exhaustive`/`Match.orElse`/`Match.option`/`Match.result` | Type-safe alternative to if/else or switch |
| Avoid nesting (pipe style) | `Effect.Do`, `Effect.bind`, `Effect.let` | Flatten dependent multi-step pipelines |
| Avoid nesting (recommended) | `Effect.gen` | Linear, imperative-style multi-step logic |
| Conditional run | `Effect.when(conditionEffect)` | Run only if condition holds, wrapped in `Option` |
| Combine two effects | `Effect.zip` / `Effect.zipWith` | Tuple result / custom combiner |
| Loop with state | `Effect.whileLoop` | Manual state-driven iteration |
| Loop over iterable | `Effect.forEach` | Per-element effectful operation, with concurrency control |
| Collect many effects | `Effect.all` | Tuple/array/struct/record combination, short-circuit or `{ mode: "result" }` |

## Conventions to follow when writing Effect code

- Run the whole program through the platform `runMain` (`NodeRuntime.runMain`, etc.), not a bare `runFork`/`runPromise` at the top level.
- Never pass a bare function reference as a callback (`Effect.map(fn)`); wrap it in a lambda (`Effect.map((x) => fn(x))`) to preserve inference and stack traces.
- Prefer data-last + `pipe` inside multi-step pipelines; use data-first for single standalone calls.
- Brand primitive domain values (IDs, validated numbers/strings) with `Brand.nominal`/`Brand.make`/`Brand.all` instead of passing raw `number`/`string`.
- Use `Match` (`Match.type`/`Match.value` + `when`/`tag`/`not` + `exhaustive`/`orElse`) instead of long `if`/`else` or `switch` chains, especially over `_tag`-discriminated unions.
- Default to `Effect.gen` for multi-step dependent effect logic; avoid nesting `pipe`/`andThen` more than one level deep. Reach for `Effect.Do`/`Effect.bind`/`Effect.let` only if staying in pure pipeline style.
- Use `Effect.when`, `Effect.zip`/`zipWith`, `Effect.forEach`, and `Effect.all` for conditional/combining/looping logic instead of hand-rolled control flow around raw effects.
