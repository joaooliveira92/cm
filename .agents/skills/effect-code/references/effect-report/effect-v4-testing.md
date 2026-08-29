# Effect v4 — Testing Notes

Source: https://www.effect.website/docs/v4/testing/testclock (v4 rc). No sibling "Testing" overview page exists yet — `docs/v4/testing` 404s, and the TestClock page's own sidebar section lists only "TestClock" under "Testing".

Status: research notes, distilled from the official docs.

---

## 1. What TestClock is and why it exists

`TestClock` is a virtual wall clock that "only moves forward when we adjust it manually." Instead of code under test actually waiting for real wall-clock time to pass, `TestClock` lets a test simulate the passage of time synchronously and instantly — `Effect.sleep("5 minutes")` doesn't cost 5 real minutes, it costs however long `TestClock.adjust("5 minutes")` takes to execute (effectively 0). When you call `TestClock.adjust`, any effect that was scheduled to resume at or before the new virtual time executes.

This makes tests for timeouts, retries/repeats, delayed queues, and other time-based logic both fast and deterministic.

`TestClock` is provided as a `Layer`: `TestClock.layer()`. You provide it to the test effect via `Effect.provide(TestClock.layer())`, and interact with it through the `TestClock` module (imported from `effect/testing`), e.g.:

```ts
import { TestClock } from "effect/testing"
```

## 2. Adjusting virtual time — `TestClock.adjust`

`TestClock.adjust(duration)` advances the virtual clock forward by the given duration (accepts the same duration strings as `Effect.sleep`, e.g. `"1 minute"`, `"60 minutes"`, `"10 seconds"`). Any fiber suspended on `Effect.sleep`/timeouts/schedules whose wake-up time falls within that window resumes as part of the adjustment.

Basic pattern: fork a fiber that will sleep or wait, then adjust the clock, then join the fiber and assert on its result.

```ts
import { Effect, Fiber, Option } from "effect"
import { TestClock } from "effect/testing"
import * as assert from "node:assert"

const test = Effect.gen(function* () {
  // Create a fiber that sleeps for 5 minutes and then times out
  // after 1 minute
  const fiber = yield* Effect.sleep("5 minutes").pipe(
    Effect.map(Option.some),
    Effect.timeoutOrElse({
      duration: "1 minute",
      orElse: () => Effect.succeed(Option.none<void>()),
    }),
    Effect.forkChild,
  )

  // Adjust the TestClock by 1 minute to simulate the passage of time
  yield* TestClock.adjust("1 minute")

  // Get the result of the fiber
  const result = yield* Fiber.join(fiber)

  // Check if the result is None, indicating a timeout
  assert.ok(Option.isNone(result))
}).pipe(Effect.provide(TestClock.layer()))

const outcome = await Effect.runPromise(test)
outcome // => undefined
```

Here `Effect.sleep("5 minutes")` never actually completes in real time — the outer `Effect.timeoutOrElse("1 minute")` races it, and adjusting the virtual clock by exactly 1 minute is enough to trigger the timeout branch deterministically, without waiting a real minute.

## 3. Setting virtual time — `TestClock.setTime`

The doc page fetched here focuses on `TestClock.adjust`; `TestClock.setTime` is mentioned as the other primitive for controlling the clock (setting it to an absolute point in time rather than advancing it by a relative duration), used the same way — provide `TestClock.layer()` and call it inside the test effect before/around forking the effect under test. Prefer `adjust` for "advance by N" assertions and `setTime` when a test needs the clock pinned to a specific instant.

## 4. Testing `Effect.sleep` and `Effect.timeout`

The core pattern (see section 2) is: fork the effect that sleeps/times out, `TestClock.adjust` past the relevant duration, then join and assert. Because `TestClock` intercepts scheduling, `Effect.timeout`/`Effect.timeoutOrElse` races resolve based on virtual time, not real time — a test asserting a 1-minute timeout completes instantly.

## 5. Testing recurring effects (`Effect.repeat`, `Schedule`, `Effect.forever`)

To test recurring/scheduled effects, offer work onto an unbounded `Queue` from a forked, repeating effect, then use `TestClock.adjust` to step through each recurrence interval and `Queue.poll`/`Queue.take` to assert what has (or hasn't) run yet:

```ts
import { Effect, Queue, Option } from "effect"
import { TestClock } from "effect/testing"
import * as assert from "node:assert"

const test = Effect.gen(function* () {
  const q = yield* Queue.unbounded()

  yield* Queue.offer(q, undefined).pipe(
    // Delay the effect for 60 minutes and repeat it forever
    Effect.delay("60 minutes"),
    Effect.forever,
    Effect.forkChild,
  )

  // Check if no effect is performed before the recurrence period
  const a = yield* Queue.poll(q).pipe(Effect.map(Option.isNone))

  // Adjust the TestClock by 60 minutes to simulate the passage of time
  yield* TestClock.adjust("60 minutes")

  // Check if an effect is performed after the recurrence period
  const b = yield* Queue.take(q).pipe(Effect.as(true))

  // Check if the effect is performed exactly once
  const c = yield* Queue.poll(q).pipe(Effect.map(Option.isNone))

  // Adjust the TestClock by another 60 minutes
  yield* TestClock.adjust("60 minutes")

  // Check if another effect is performed
  const d = yield* Queue.take(q).pipe(Effect.as(true))
  const e = yield* Queue.poll(q).pipe(Effect.map(Option.isNone))

  // Ensure that all conditions are met
  assert.ok(a && b && c && d && e)
}).pipe(Effect.provide(TestClock.layer()))

const outcome = await Effect.runPromise(test)
outcome // => undefined
```

This pattern generalizes to `Schedule`-based `Effect.retry`/`Effect.repeat`: fork the retrying/repeating effect, adjust the clock by each expected backoff/interval duration in sequence, and assert on side effects (queue items, counters, etc.) between adjustments to verify exact-once-per-interval behavior.

## 6. `Clock` module interplay — `Clock.currentTimeMillis`

Once `TestClock.layer()` is provided, the ambient `Clock` service (`Clock.currentTimeMillis`, etc.) reads from the virtual clock too — so any code that measures elapsed time via `Clock` (rather than sleeping) is also test-controllable:

```ts
import { Effect, Clock } from "effect"
import { TestClock } from "effect/testing"
import * as assert from "node:assert"

const test = Effect.gen(function* () {
  // Get the current time using the Clock
  const startTime = yield* Clock.currentTimeMillis

  // Adjust the TestClock by 1 minute to simulate the passage of time
  yield* TestClock.adjust("1 minute")

  // Get the current time again
  const endTime = yield* Clock.currentTimeMillis

  // Check if the time difference is at least
  // 60,000 milliseconds (1 minute)
  assert.ok(endTime - startTime >= 60_000)
}).pipe(Effect.provide(TestClock.layer()))

const outcome = await Effect.runPromise(test)
outcome // => undefined
```

## 7. Interaction with fibers, `Deferred`, and concurrency

`TestClock` only resumes fibers that are already suspended waiting on the virtual clock (e.g. inside `Effect.sleep`) at the moment `adjust`/`setTime` runs. This means the standard shape of every example is:

1. **Fork** the effect that will eventually sleep/wait, using `Effect.forkChild` (a child fiber of the test fiber).
2. **Adjust** the clock by the duration needed to cross the relevant threshold.
3. **Join** the fiber (`Fiber.join`) or otherwise observe its effect (`Queue.take`, `Deferred.await`) to get the result.

If step 2 happens before the forked fiber has actually reached its `Effect.sleep` and registered with the virtual clock, the adjustment could be missed — which is why these examples fork first and rely on the effects being structured so the fork completes registration before the test fiber proceeds to `adjust`. In more subtle concurrent scenarios (e.g. racing multiple sleeps), tests may need an extra yield point before adjusting to make sure all fibers have suspended on the clock.

Concurrent scenarios combining sleeps with other primitives like `Deferred` follow the same fork → adjust → await pattern:

```ts
import { Effect, Deferred } from "effect"
import { TestClock } from "effect/testing"
import * as assert from "node:assert"

const test = Effect.gen(function* () {
  // Create a deferred value
  const deferred = yield* Deferred.make<number, void>()

  // Run two effects concurrently: sleep for 10 seconds and succeed
  // the deferred with a value of 1
  yield* Effect.all(
    [Effect.sleep("10 seconds"), Deferred.succeed(deferred, 1)],
    {
      concurrency: "unbounded",
    },
  ).pipe(Effect.forkChild)

  // Adjust the TestClock by 10 seconds
  yield* TestClock.adjust("10 seconds")

  // Await the value from the deferred
  const readRef = yield* Deferred.await(deferred)

  // Verify the deferred value is correctly set
  assert.ok(readRef === 1)
}).pipe(Effect.provide(TestClock.layer()))

const outcome = await Effect.runPromise(test)
outcome // => undefined
```

Note `Effect.all` with `{ concurrency: "unbounded" }` runs the sleep and the `Deferred.succeed` concurrently in the forked fiber; adjusting the clock by exactly the sleep duration is what lets that branch of the fork complete, after which `Deferred.await` in the parent unblocks.

## 8. Runtime/test-utils setup

- Import `TestClock` from `effect/testing` (not the top-level `effect` package): `import { TestClock } from "effect/testing"`.
- Provide it as a `Layer` around the test effect: `.pipe(Effect.provide(TestClock.layer()))`.
- Run the resulting effect normally with `Effect.runPromise` (or `runSync`/`runFork` as appropriate) — no special test runner integration is shown in the doc; the examples use plain `Effect.gen` + Node's built-in `node:assert`, so `TestClock` composes with whatever test framework wraps the `Effect.runPromise` call (e.g. `it("...", () => Effect.runPromise(test))`).
- Fork effects under test with `Effect.forkChild` (a fiber scoped as a child of the current fiber) rather than `Effect.fork`/`Effect.runFork`, matching every example on the page.

---

## Cheatsheet

| API | Given | Result / purpose |
|---|---|---|
| `TestClock.layer()` | — | `Layer` providing the virtual clock; `Effect.provide` it around the test |
| `TestClock.adjust(duration)` | duration string (e.g. `"1 minute"`) | Advances virtual time, resuming any fibers suspended on the clock up to that point |
| `TestClock.setTime(...)` | absolute time | Sets virtual clock to a specific instant (vs. relative `adjust`) |
| `Effect.forkChild` | `Effect<A,E,R>` | Starts a child fiber of the current fiber — used to put the effect under test "in the background" before adjusting time |
| `Fiber.join(fiber)` | `RuntimeFiber<A,E>` | Waits for and returns the forked fiber's result |
| `Clock.currentTimeMillis` | — | Reads current time from the ambient `Clock` service; reflects `TestClock` when `TestClock.layer()` is provided |
| `Effect.sleep(duration)` | duration | Suspends the fiber; only resumes when `TestClock` is adjusted past it (under test) or real time passes (in prod) |
| `Effect.timeout` / `Effect.timeoutOrElse` | duration | Races the source against the (virtual) clock; testable the same way as `sleep` |
| `Queue.unbounded()` + `Queue.offer`/`poll`/`take` | — | Common harness for asserting a recurring effect ran (or didn't) between clock adjustments |
| `Deferred.make` / `Deferred.succeed` / `Deferred.await` | — | Common harness for asserting concurrent, clock-gated completion |

## Conventions to follow when writing Effect code

- Use `TestClock` (from `effect/testing`) instead of real delays for any test exercising `Effect.sleep`, `Effect.timeout`/`timeoutOrElse`, or `Schedule`-based `retry`/`repeat` — never let a test actually wait on wall-clock time.
- Always provide `TestClock.layer()` via `Effect.provide` around the test effect.
- Fork the effect under test with `Effect.forkChild` before calling `TestClock.adjust`/`setTime`, so the fiber is already suspended on the virtual clock when time advances.
- After adjusting, observe results via `Fiber.join`, a `Queue`, or a `Deferred` rather than polling/sleeping in the test itself.
- For recurring effects (`Effect.forever`, `Schedule`-driven repeats/retries), step the clock forward one interval at a time and assert between each step (e.g. via `Queue.poll`/`Queue.take`) to verify exact timing and cadence, not just eventual completion.
- Prefer `TestClock.adjust(duration)` for "advance by N" assertions; reach for `TestClock.setTime` only when a test needs the clock pinned to a specific absolute instant.
