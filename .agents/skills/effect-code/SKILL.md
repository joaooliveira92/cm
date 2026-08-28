---
name: effect-code
description: "Write Effect (v4) code with its conventions: the Effect<A, E, R> type, constructors, running, Effect.gen vs pipelines, composition, and control flow. Use when writing or reviewing code that uses the `effect` package, or when the user asks to write Effect code, fix Effect types/errors, or structure an Effect program."
---

# Effect Code

Reference for writing Effect v4 code. Distilled from the official Getting Started guide (see `.agents/notes/effect-v4-getting-started.md` for the fuller notes).

## The core idea

An `Effect` is a **lazy**, immutable description of a workflow. It does not run until you execute it. Its type tracks three things:

```
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

## Error and dependency conventions

- **Expected errors** — `Effect.fail` with tagged errors so they can be caught by tag:
  ```ts
  class HttpError extends Data.TaggedError("HttpError")<{}> {}
  const program = Effect.fail(new HttpError())
  ```
- **Unexpected throws** become **defects** (a bug signal), catchable with `Effect.catchDefect`, not normal failures.
- **Context** — functions that need a service declare it in `R` instead of threading it through arguments; swap implementations (real vs mock) at the edge.

## Gotchas

- **Lazy vs eager**: `Effect.succeed(i++)` runs the side effect at construction. Use `Effect.suspend(() => effect)` to defer per-invocation, to break recursion (deep recursion → stack overflow), and to unify a union return type.
- **Type narrowing**: after `yield* Effect.fail(...)` inside `gen`, TypeScript still thinks later code is reachable — `return yield* Effect.fail(...)` to narrow.
- **Option/Result interop**: `Option<A>` reads as `Effect<A, NoSuchElementError>`; `Result<A, E>` reads as `Effect<A, E>`. Errors join a union.

## Verification

Run `tsc --noEmit` (needs `"strict": true`). Common failure modes in Effect code are type-level: unhandled error channel (`E` not `never`), missing `Requirements` (`R` not `empty`), or using `runSync` on an effect that can fail or go async.