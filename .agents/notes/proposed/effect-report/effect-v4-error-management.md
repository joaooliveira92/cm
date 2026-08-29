# Effect v4 — Error Management Notes

Source: https://www.effect.website/docs/v4/error-management/two-error-types (v4 rc) and the following pages in the Error Management section.

Status: research notes, distilled from the official docs.

---

## 1. Two Error Types

Effect distinguishes **expected errors** from **unexpected errors** (defects) — a program's domain vs bugs/broken invariants.

### Expected errors (failures / typed errors / recoverable errors)
Part of normal program execution (invalid input, missing record, rejected request). Tracked in the **error channel** of `Effect`:

```
         ┌─── Success type         │        ┌─── Error type         │        │      ┌─── Requirements
         ▼        ▼      ▼
Effect<string, HttpError, never>
```

The type makes possible failure visible to callers, who can recover with `Effect.catch` or `Effect.catchTag`.

### Unexpected errors (defects)
Not part of intended control flow (failed assertions, impossible states, bugs in third-party code). **Not tracked in the `Effect` error channel** — still retained by the runtime in the effect's `Cause`, together with typed failures and fiber interruptions.

Defects usually should not be recovered from inside domain logic. At application boundaries, `Effect.exit`, `Effect.catchDefect`, or `Effect.catchCause` can inspect/report them.

---

## 2. Expected Errors

Error type is explicit in `Effect<Success, Error, Requirements>` — callers see which failures are possible and decide which to recover from.

### Creating
`Effect.fail(error)` creates an Effect that fails with `error`. `Effect.failSync` defers construction of the error until run.

```typescript
import { Data, Effect } from "effect"

class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: string
}> {}

const findUser = (id: string): Effect.Effect<string, UserNotFound> =>
  id === "1" ? Effect.succeed("Alice") : Effect.fail(new UserNotFound({ id }))

Effect.runSync(Effect.flip(findUser("2")))._tag // => "UserNotFound"
```

Errors built with `Data.Error` or `Data.TaggedError` are also **yieldable directly** inside `Effect.gen` (see section 12).

### Tracking multiple error types
Composing effects with different error types tracks the **union**:

```typescript
class InvalidInput extends Data.TaggedError("InvalidInput")<{}> {}
class UserNotFound extends Data.TaggedError("UserNotFound")<{}> {}

declare const validate: Effect.Effect<string, InvalidInput>
declare const loadUser: (id: string) => Effect.Effect<string, UserNotFound>

// Effect<string, InvalidInput | UserNotFound>
const program = Effect.gen(function* () {
  const id = yield* validate
  return yield* loadUser(id)
})
```

Sequential composition short-circuits on the first failure; later operations are not evaluated.

### Exposing errors as values

**`Effect.result`** — moves the typed error into a `Result` in the success channel: `Effect<A, E, R> -> Effect<Result<A, E>, never, R>`. Handles typed failures only — defects/interruptions remain failures of the fiber.

```typescript
import { Effect, Result } from "effect"

const result = Effect.runSync(Effect.result(Effect.fail("unavailable")))

Result.match(result, {
  onFailure: (error) => `failure: ${error}`,
  onSuccess: (value) => `success: ${value}`,
}) // => "failure: unavailable"
```

**`Effect.option`** — discards the error value: `Option.some(value)` on success, `Option.none()` on typed failure. Use `result` when the error matters; `option` only when every typed failure means absence.

### Catching every typed error
`Effect.catch` handles every typed error with a recovery Effect (not defects/interruptions).

```typescript
const program = Effect.fail("unavailable").pipe(
  Effect.catch((error) => Effect.succeed(`recovered: ${error}`)),
)
Effect.runSync(program) // => "recovered: unavailable"
```

`Effect.catchEager` is an eager optimization when the handler can be evaluated immediately. Use `Effect.catchCause` when the handler needs the complete cause.

### Catching selected errors

- **`catchTag`** — handles one member of a tagged error union, removes it from the resulting error type. Also accepts an array of tags for one shared handler.
- **`catchTags`** — table of tag-specific handlers for several tagged errors at once.
- **`catchIf`** — selects errors via a predicate or type guard.
- **`catchFilter`** — uses the `Filter` module for reusable/composable selection; a narrowing filter removes the handled subtype from the error channel.

```typescript
class NetworkError extends Data.TaggedError("NetworkError")<{ readonly status: number }> {}
class ValidationError extends Data.TaggedError("ValidationError")<{ readonly field: string }> {}

const request: Effect.Effect<string, NetworkError | ValidationError> =
  Effect.fail(new NetworkError({ status: 503 }))

// Effect<string, ValidationError>
const recovered = request.pipe(
  Effect.catchTag("NetworkError", (error) => Effect.succeed(`cached after ${error.status}`)),
)
```

```typescript
const recovered2 = request.pipe(
  Effect.catchTags({
    NetworkError: (error) => Effect.succeed(`network: ${error.status}`),
    ValidationError: (error) => Effect.succeed(`invalid: ${error.field}`),
  }),
)
```

```typescript
Effect.fail(404).pipe(
  Effect.catchIf(
    (status) => status === 404,
    () => Effect.succeed("not found"),
  ),
)
```

```typescript
import { Filter } from "effect"
task.pipe(
  Effect.catchFilter(Filter.tagged("NetworkError"), () => Effect.succeed("using cache")),
)
```

### Catching nested error reasons
Tagged errors can hold another tagged error in a readonly `reason` field. `Effect.catchReason` handles one nested reason (keeping the parent error type for unmatched reasons); `Effect.catchReasons` handles several.

```typescript
class RateLimitError extends Data.TaggedError("RateLimitError")<{ readonly retryAfter: number }> {}
class QuotaExceededError extends Data.TaggedError("QuotaExceededError")<{}> {}
class ApiError extends Data.TaggedError("ApiError")<{
  readonly reason: RateLimitError | QuotaExceededError
}> {}

const request2: Effect.Effect<string, ApiError> = Effect.fail(
  new ApiError({ reason: new RateLimitError({ retryAfter: 30 }) }),
)

const program2 = request2.pipe(
  Effect.catchReason("ApiError", "RateLimitError", (reason) =>
    Effect.succeed(`retry after ${reason.retryAfter}s`),
  ),
)
```

`Effect.unwrapReason(errorTag)` replaces the parent error with its nested reasons in the error channel instead of handling immediately.

---

## 3. Unexpected Errors / Defects

Defects indicate bugs, violated invariants, or failures outside the program's domain. Retained in the runtime `Cause`, not in the typed error channel. Normally report and let them terminate the fiber; recover only at boundaries where continuing is explicitly safe.

### Creating a defect
`Effect.die(defect)` terminates with the given defect; typed error channel is `never`.

```typescript
import { Effect, Exit } from "effect"

const divide = (a: number, b: number) =>
  b === 0 ? Effect.die(new Error("Cannot divide by zero")) : Effect.succeed(a / b)

const exit = Effect.runSyncExit(divide(1, 0))
Exit.isFailure(exit) && exit.cause.reasons[0]?._tag // => "Die"
```

Pass a string or (preferably) an `Error` to `Effect.die`. Exceptions thrown while evaluating callbacks such as `Effect.sync` also become defects.

### Converting typed errors to defects
`Effect.orDie` converts every typed failure into a defect, removing the typed error channel.

```typescript
const program = Effect.fail(new Error("Invalid startup configuration")).pipe(Effect.orDie)
const exit = Effect.runSyncExit(program)
Exit.isFailure(exit) && exit.cause.reasons[0]?._tag // => "Die"
```

To customize the defect, `Effect.mapError` first, then `Effect.orDie`:

```typescript
import { Cause, Effect, Exit, Predicate } from "effect"

const program2 = Effect.fail("missing token").pipe(
  Effect.mapError((message) => new Error(`Startup failed: ${message}`)),
  Effect.orDie,
)
const exit2 = Effect.runSyncExit(program2)
const reason = Exit.isFailure(exit2) ? exit2.cause.reasons[0] : undefined
const message =
  reason !== undefined && Cause.isDieReason(reason) && Predicate.isError(reason.defect)
    ? reason.defect.message
    : undefined
// message => "Startup failed: missing token"
```

### Inspecting the complete exit
`Effect.exit` moves the complete outcome into the success channel: `Effect<A, E, R> -> Effect<Exit<A, E>, never, R>`. Unlike `Effect.result`, `Exit` preserves the complete `Cause`, including defects/interruptions.

```typescript
const exit3 = Effect.runSync(Effect.exit(Effect.die("boom")))
const hasDefect = Exit.isFailure(exit3) && Cause.hasDies(exit3.cause) // => true
```

### catchDefect
Handles defects only; typed failures/interruptions untouched.

```typescript
const program3 = Effect.die(new Error("plugin crashed")).pipe(
  Effect.catchDefect((defect) =>
    Predicate.isError(defect) ? Effect.succeed(`disabled plugin: ${defect.message}`) : Effect.die(defect),
  ),
)
```

### catchCause
Handles the complete `Cause` — typed failures, defects, interruptions, multiple reasons.

```typescript
const program4 = Effect.die("boom").pipe(
  Effect.catchCause((cause) =>
    Cause.hasDies(cause) ? Effect.succeed("recovered at the boundary") : Effect.failCause(cause),
  ),
)
```

Prefer typed operators (`Effect.catch`, `Effect.catchTag`) for domain errors; use `catchDefect`/`catchCause` only where recovering from unexpected failures is intentional and safe.

---

## 4. Fallback

Three fallback operators for recovering from typed failures.

### catch
Receives the error, returns a fallback Effect (not evaluated if source succeeds).

```typescript
const primary = Effect.fail("primary unavailable")
const program = primary.pipe(Effect.catch((error) => Effect.succeed(`fallback: ${error}`)))
Effect.runSync(program) // => "fallback: primary unavailable"
```

### orElseSucceed
Replaces any typed failure with a lazily evaluated success value, removes the typed error channel.

```typescript
const program2 = Effect.fail("missing").pipe(Effect.orElseSucceed(() => 0))
Effect.runSync(program2) // => 0
```

### firstSuccessOf
Runs alternatives sequentially, stops at first success. If all fail, propagates the last error.

```typescript
const program3 = Effect.firstSuccessOf([
  Effect.fail("primary unavailable"),
  Effect.succeed("secondary result"),
  Effect.die("not evaluated"),
])
Effect.runSync(program3) // => "secondary result"
```

Defects and interruptions remain unchanged by these operators. For specific scenarios, prefer selective catch operators (`catchTag`, `catchIf`, `catchFilter`).

---

## 5. Matching

Matching consumes both channels of an `Effect` and produces one result. Ordinary variants handle typed failures; `Cause` variants also handle defects/interruptions.

### match
Pure functions for typed failure or success (no defects/interruptions).

```typescript
const task: Effect.Effect<number, string> = Effect.fail("unavailable")
const program = Effect.match(task, {
  onFailure: (error) => `failure: ${error}`,
  onSuccess: (value) => `success: ${value}`,
})
Effect.runSync(program) // => "failure: unavailable"
```

### matchEffect
Effectful version — both handlers return Effects (may introduce new errors/requirements).

```typescript
const task2: Effect.Effect<number, string> = Effect.succeed(42)
const program2 = Effect.matchEffect(task2, {
  onFailure: (error) => Effect.succeed(`failure: ${error}`),
  onSuccess: (value) => Effect.succeed(`success: ${value}`),
})
Effect.runSync(program2) // => "success: 42"
```

### matchCause / matchCauseEffect
Pass the complete `Cause` to `onFailure`, so defects and interruptions are handled too. `matchCauseEffect` is the effectful counterpart.

```typescript
const program3 = Effect.die("boom").pipe(
  Effect.matchCause({
    onFailure: (cause) => (Cause.hasDies(cause) ? "terminated by a defect" : "failed"),
    onSuccess: () => "succeeded",
  }),
)
Effect.runSync(program3) // => "terminated by a defect"
```

### ignore / ignoreCause
`ignore` discards the success value and recovers from typed errors → `Effect<void, never, R>`. `ignoreCause` also discards every failure cause — "use it sparingly because it can hide defects."

```typescript
Effect.runSync(Effect.ignore(Effect.fail("error"))) // => undefined

const defect = Effect.ignore(Effect.die("boom"))
Effect.runSyncExit(defect) // => Exit.die("boom")

Effect.runSync(Effect.ignoreCause(Effect.die("boom"))) // => undefined
```

---

## 6. Retrying

Retrying is appropriate for transient failures (temporary network/service unavailability). Not a substitute for handling permanent errors; defects and interruptions are never retried.

### Effect.retry
Reruns an Effect after a typed failure. The source runs once before any retry policy applies; `{ times: 5 }` allows up to six total executions.

### Selective retrying
Options combine: `while` (retry while predicate true), `until` (stop when predicate true), `times` (limit count), `schedule` (control timing). Predicates may return boolean or an Effect.

### Schedule-based retrying
A `Schedule` defines delays, backoff, jitter, and retry limits — e.g. `Schedule.recurs(3)` permits three retries after the initial attempt.

### Effect.retryOrElse
Applies a `Schedule` and runs a fallback Effect when the schedule is exhausted. The fallback receives both the final error and the schedule's output.

Related: `Effect.repeat` for repetition based on successful values rather than errors; see the full scheduling docs for advanced strategies.

---

## 7. Timing Out

Timeout operators race an Effect against a duration. If the timeout wins, the source Effect is interrupted before the timeout outcome is produced.

### timeout
`Effect.timeout` represents a timeout as a typed `Cause.TimeoutError`.

```typescript
const program = Effect.never.pipe(Effect.timeout(0))
const error = await Effect.runPromise(Effect.flip(program))
error._tag // => "TimeoutError"
```

If the source fails before the timeout, the original error is preserved; if it succeeds in time, its value is returned unchanged.

```typescript
const program2 = Effect.succeed("result").pipe(Effect.timeout("1 second"))
Effect.runSync(program2) // => "result"
```

### timeoutOption
Represents only the timeout case as `Option.none()`; a timely success becomes `Option.some(value)`. Typed failures from the source remain in the error channel. Use only when a timeout genuinely means absence.

```typescript
const timedOut = await Effect.runPromise(Effect.never.pipe(Effect.timeoutOption(0)))
timedOut // => Option.none()

const completed = Effect.runSync(Effect.succeed("result").pipe(Effect.timeoutOption("1 second")))
completed // => Option.some("result")
```

### timeoutOrElse
Switches to a lazily constructed fallback Effect when the timeout wins; the fallback may introduce its own success/error/requirement types.

```typescript
const program3 = Effect.never.pipe(
  Effect.timeoutOrElse({ duration: 0, orElse: () => Effect.succeed("cached result") }),
)
await Effect.runPromise(program3) // => "cached result"
```

Return `Effect.fail` from the fallback for a domain-specific timeout error:

```typescript
class RequestTimeout extends Data.TaggedError("RequestTimeout")<{ readonly endpoint: string }> {}

const program4 = Effect.never.pipe(
  Effect.timeoutOrElse({
    duration: 0,
    orElse: () => Effect.fail(new RequestTimeout({ endpoint: "/users" })),
  }),
)
await Effect.runPromiseExit(program4) // => Exit.fail(new RequestTimeout({ endpoint: "/users" }))
```

Returning `Effect.die` (or `Effect.failCause(Cause.die(...))`) from the fallback makes the timeout a defect — reserve for when timing out violates an invariant.

### Interruption and uninterruptible work
The timeout fiber interrupts the source when the duration expires; most Effects respond immediately. An uninterruptible region defers that interruption, so the caller may wait longer than configured. If work should intentionally outlive the caller, fork it into an appropriately supervised or detached fiber explicitly — don't use detachment merely to make a timeout return early.

---

## 8. Sandboxing

`Effect.sandbox` exposes the complete failure `Cause` in the typed error channel: `Effect<A, E, R> -> Effect<A, Cause<E>, R>`.

A `Cause<E>` can contain typed failures, defects, interruptions, or several reasons at once. Causes are **flat** — inspect the readonly `reasons` array and use the reason guards from the `Cause` module.

- **Inspecting a sandboxed cause** — extract specific failure reasons, e.g. `cause.reasons.find(Cause.isFailReason)`, to selectively recover.
- **Restoring the original error model** — convert back with `Effect.catch(Effect.failCause)` when recovery isn't needed.

For a single recovery step, `Effect.catchCause` is usually simpler — it provides the same `Cause` directly without first changing the error type.

---

## 9. Error Accumulation

`Effect.all` and `Effect.forEach` fail fast by default. Validation often needs different behavior: evaluate every input and report all problems together.

### validate
`Effect.validate` applies an effectful function to every element. If all succeed, returns all success values. If any fail, returns every error as a non-empty array and discards the successes.

```typescript
const program = Effect.validate([1, 2, 3, 4], (value) =>
  value % 2 === 0 ? Effect.succeed(value) : Effect.fail(`${value} is not even`),
)
Effect.runSyncExit(program) // => Exit.fail(["1 is not even", "3 is not even"])
```

Every element is evaluated. Use `{ concurrency }` to control parallelism, `{ discard: true }` when only validation (not values) is needed.

### partition
`Effect.partition` also evaluates every element but never fails — returns `[failures, successes]`, preserving both sides.

```typescript
const program2 = Effect.partition([0, 1, 2, 3, 4], (value) =>
  value % 2 === 0 ? Effect.succeed(value) : Effect.fail(`${value} is not even`),
)
Effect.runSync(program2) // => [["1 is not even", "3 is not even"], [0, 2, 4]]
```

Also accepts a `concurrency` option.

---

## 10. Error Channel Operations

Operators that change or observe failure behavior without requiring immediate recovery.

### mapError / mapBoth
`Effect.mapError` transforms the typed error, leaving success unchanged.

```typescript
const program = Effect.fail("unavailable").pipe(Effect.mapError((message) => new Error(message)))
const error = Effect.runSync(Effect.flip(program))
error.message // => "unavailable"
```

`Effect.mapBoth` transforms success and error in one operation.

```typescript
const program2 = Effect.succeed(2).pipe(
  Effect.mapBoth({
    onFailure: (message: string) => new Error(message),
    onSuccess: (value) => value * 2,
  }),
)
Effect.runSync(program2) // => 4
```

Eager variants `mapErrorEager` / `mapBothEager` optimize mappings that can be evaluated immediately.

### filterOrFail / filterOrElse
`Effect.filterOrFail` keeps a success value satisfying a predicate, otherwise creates a typed failure.

```typescript
const program3 = Effect.succeed(-1).pipe(
  Effect.filterOrFail(
    (value) => value >= 0,
    (value) => `Expected a non-negative number, got ${value}`,
  ),
)
Effect.runSyncExit(program3) // => Exit.fail("Expected a non-negative number, got -1")
```

A user-defined type guard narrows the success type:

```typescript
interface User { readonly name: string }
const user: Effect.Effect<User | null> = Effect.succeed({ name: "Alice" })
const name = user.pipe(
  Effect.filterOrFail(
    (value): value is User => value !== null,
    () => new Error("Unauthorized"),
  ),
  Effect.map((value) => value.name),
)
```

`Effect.filterOrElse` runs another Effect on predicate failure instead of producing a value directly.

### Tap operators (inspecting failures without recovering)
Run an observation Effect and preserve the original outcome; if the observation fails, its failure composes with the original.

- **`tapError`** — observes every typed error.
- **`tapErrorTag`** — observes only one tagged-error union member.
- **`tapCause`** — observes the complete `Cause` (typed failures, defects, interruptions, multiple reasons).
- **`tapDefect`** — observes defects only, not ordinary typed failures.

```typescript
const observed: Array<string> = []
const program4 = Effect.fail("NetworkError").pipe(
  Effect.tapError((error) => Effect.sync(() => { observed.push(error) })),
)
Effect.runSyncExit(program4) // => Exit.fail("NetworkError")
```

```typescript
class NetworkError extends Data.TaggedError("NetworkError")<{ readonly status: number }> {}
const observed2: Array<number> = []
const error2 = new NetworkError({ status: 503 })
Effect.fail(error2).pipe(
  Effect.tapErrorTag("NetworkError", (error) => Effect.sync(() => { observed2.push(error.status) })),
)
```

### Moving failures into the success channel
`Effect.result` exposes typed failures as `Result.Failure`; `Effect.exit` exposes the complete outcome including the full `Cause`:

```
Effect<A, E, R> -> Effect<Result<A, E>, never, R>
Effect<A, E, R> -> Effect<Exit<A, E>, never, R>
```

When a typed error and success should become the same success type, recover with `Effect.catch`:

```typescript
const program5: Effect.Effect<number, number> = Effect.fail(1)
const merged = program5.pipe(Effect.catch(Effect.succeed))
Effect.runSync(merged) // => 1
```

### Flipping channels
`Effect.flip` swaps the typed error and success channels.

```typescript
const program6 = Effect.fail("unavailable").pipe(Effect.as(42))
const flipped = Effect.flip(program6)
Effect.runSync(flipped) // => "unavailable"
```

`flip` is useful for focused transformations of an error channel, but `mapError` or a catch operator usually communicates intent more directly.

---

## 11. Parallel and Sequential Errors

Most Effect combinators fail fast: once an effect fails, later work isn't started and concurrent work is interrupted. Some operations still produce several failure reasons — e.g. concurrent fibers failing together, or both an operation and its finalizer failing.

### Flat causes
`Cause<E>` contains a flat readonly array of `Reason<E>` values:

```
type Reason<E> = Cause.Fail<E> | Cause.Die | Cause.Interrupt
```

Reasons combined sequentially and reasons combined in parallel use the same `reasons` array representation (no separate `Sequential`/`Parallel` tree in this doc — it's flattened).

```typescript
import { Cause } from "effect"

const cause = Cause.combine(
  Cause.fail("request failed"),
  Cause.die(new Error("finalizer failed")),
)

cause.reasons.map((reason) => reason._tag) // => ["Fail", "Die"]
```

Use `Cause.hasFails`, `Cause.hasDies`, `Cause.hasInterrupts` when only the kind matters. Use `cause.reasons` or extractors like `Cause.findError` / `Cause.findDefect` when individual values are needed.

### Accumulating domain errors
Multiple typed validation errors are usually better represented as **data** rather than multiple `Cause` reasons — use `Effect.validate` to collect every typed error, or `Effect.partition` to preserve both failures and successes (section 9).

Note: this fetched page did not mention `FiberFailure` explicitly.

---

## 12. Yieldable Errors

### Data.Error
Use when the error does not need a discriminant tag. Directly yieldable in `Effect.gen` without wrapping in `Effect.fail`.

```typescript
import { Data, Effect, Exit } from "effect"

class InvalidInput extends Data.Error<{
  readonly message: string
}> {}

const program = Effect.gen(function* () {
  return yield* new InvalidInput({ message: "Name is required" })
})

Effect.runSyncExit(program) // => Exit.fail(new InvalidInput({ message: "Name is required" }))
```

### Data.TaggedError
Adds a readonly `_tag` field, forming discriminated unions that `Effect.catchTag`/`Effect.catchTags` can handle precisely.

```typescript
class NotFound extends Data.TaggedError("NotFound")<{
  readonly id: string
}> {}
class PermissionDenied extends Data.TaggedError("PermissionDenied")<{
  readonly id: string
}> {}

const loadUser = (id: string): Effect.Effect<string, NotFound | PermissionDenied> =>
  Effect.gen(function* () {
    if (id === "missing") {
      return yield* new NotFound({ id })
    }
    return `user:${id}`
  })

const program2 = loadUser("missing").pipe(
  Effect.catchTag("NotFound", (error) => Effect.succeed(`No user ${error.id}`)),
)

Effect.runSync(program2) // => "No user missing"
```

Use tagged errors for domain errors that callers may need to distinguish. The class is both the error's constructor and its TypeScript type. (The fetched page did not mention `Schema.TaggedError` explicitly.)

---

## Quick reference — most common APIs used in the guide

- **Raise**: `Effect.fail`, `Effect.failSync`, `Effect.die`, `Effect.failCause`, `Data.Error`, `Data.TaggedError` (directly yieldable)
- **Catch (typed)**: `Effect.catch`, `Effect.catchEager`, `Effect.catchTag`, `Effect.catchTags`, `Effect.catchIf`, `Effect.catchFilter`, `Effect.catchReason`, `Effect.catchReasons`, `Effect.unwrapReason`
- **Catch (defects/cause)**: `Effect.catchDefect`, `Effect.catchCause`
- **Fallback**: `Effect.catch`, `Effect.orElseSucceed`, `Effect.firstSuccessOf`, `Effect.orDie`, `Effect.orDieWith` (see mapError+orDie pattern)
- **Match**: `Effect.match`, `Effect.matchEffect`, `Effect.matchCause`, `Effect.matchCauseEffect`, `Effect.ignore`, `Effect.ignoreCause`
- **Retry/Timeout**: `Effect.retry`, `Effect.retryOrElse`, `Effect.repeat`, `Schedule.recurs`, `Effect.timeout`, `Effect.timeoutOption`, `Effect.timeoutOrElse`
- **Sandbox/Accumulate**: `Effect.sandbox`, `Cause.isFailReason`, `Effect.validate`, `Effect.partition`
- **Channel ops**: `Effect.mapError`, `Effect.mapBoth`, `Effect.mapErrorEager`, `Effect.mapBothEager`, `Effect.filterOrFail`, `Effect.filterOrElse`, `Effect.tapError`, `Effect.tapErrorTag`, `Effect.tapCause`, `Effect.tapDefect`, `Effect.result`, `Effect.exit`, `Effect.flip`
- **Cause inspection**: `Cause.hasFails`, `Cause.hasDies`, `Cause.hasInterrupts`, `Cause.findError`, `Cause.findDefect`, `Cause.combine`, `Cause.isDieReason`

## Conventions to follow when writing Effect code

- Prefer `Data.TaggedError` (or `Data.Error` when no discriminant is needed) for expected errors — they're directly yieldable in `Effect.gen`, no need to wrap in `Effect.fail`.
- Prefer `catchTag`/`catchTags`/`catchFilter` over `catchAll`-style `Effect.catch` when you want to preserve exhaustiveness of unmatched error types in the resulting type.
- Never recover from defects inside domain logic — only at explicit application boundaries (`Effect.exit`, `Effect.catchDefect`, `Effect.catchCause`).
- Use `Effect.orDie` deliberately (after `Effect.mapError` if a custom defect message is needed) to mark a typed error as truly unrecoverable.
- Use `Effect.validate`/`Effect.partition` instead of `Effect.all`/`Effect.forEach` when every input must be evaluated and all errors reported together (e.g. form validation).
- Use `Schedule` with `Effect.retry` for retry policies instead of hand-rolled loops; reserve retries for transient failures, not permanent ones.
- Use `Effect.timeout` (typed `TimeoutError`) by default; use `timeoutOrElse` when a fallback value or custom domain error is preferred over failing.
- Reach for `Effect.sandbox`/`Effect.catchCause` only when you need to inspect the full `Cause` (defects + interruptions + typed failures) — otherwise prefer the narrower typed operators.
- Use `tapError`/`tapCause`/`tapDefect` for observation/logging without altering the outcome, rather than a catch-and-rethrow pattern.
- Avoid `Effect.ignoreCause` except deliberately at a boundary — it silently hides defects.
