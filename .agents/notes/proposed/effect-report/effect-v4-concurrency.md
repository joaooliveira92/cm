# Effect v4 — Concurrency Notes

Source: https://www.effect.website/docs/v4/concurrency/basic-concurrency, https://www.effect.website/docs/v4/concurrency/fibers, https://www.effect.website/docs/v4/concurrency/deferred, https://www.effect.website/docs/v4/concurrency/queue, https://www.effect.website/docs/v4/concurrency/pubsub, https://www.effect.website/docs/v4/concurrency/semaphore, https://www.effect.website/docs/v4/concurrency/latch

Status: research notes, distilled from the official docs.

---

## 1. Basic Concurrency

Core distinction: "An Effect is a higher-level concept that describes an effectful computation. It is lazy and immutable" while "a fiber represents the running execution of an Effect. It can be interrupted or awaited to retrieve its result." Concurrency in Effect is opt-in and controlled via a `concurrency` option accepted by combinators like `Effect.all` and `Effect.forEach`.

### The `concurrency` option
Type: `number | "unbounded"`.
- Omitted (default) → **sequential** execution.
- `number` → runs up to that many effects at once, queueing the rest.
- `"unbounded"` → starts all effects immediately, no limit.

```typescript
import { Effect, Duration } from "effect"

const makeTask = (n: number, delay: Duration.Input) =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        console.log(`start task${n}`)
        setTimeout(() => {
          console.log(`task${n} done`)
          resolve()
        }, Duration.toMillis(delay))
      }),
  )

const task1 = makeTask(1, "200 millis")
const task2 = makeTask(2, "100 millis")

// Sequential (default)
const sequential = Effect.all([task1, task2])
await Effect.runPromise(sequential)
```

```typescript
// Limited concurrency: at most 2 run at a time
const numbered = Effect.all([task1, task2, task3, task4, task5], {
  concurrency: 2,
})

// Unbounded: all start immediately
const unbounded = Effect.all([task1, task2, task3, task4, task5], {
  concurrency: "unbounded",
})
```

`Effect.forEach(items, fn, { concurrency })` applies the same option when mapping an effectful function over a collection.

### Racing
- **`Effect.race(effect1, effect2)`** — runs both concurrently; "The first effect that successfully completes will determine the result of the race, and the other effect will be interrupted."
- **`Effect.raceAll(effects)`** — races many effects; returns the first success, or fails with the last error if all fail.
- **`Effect.raceFirst(effect1, effect2, options?)`** — returns whichever completes first, success **or** failure (unlike `race`, which waits for a success). Accepts an optional `onWinner` callback to observe the winner.

```typescript
import { Effect, Console } from "effect"

const task1 = Effect.succeed("task1").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

const program = Effect.race(task1, task2)
await Effect.runPromise(program)
```

```typescript
const program2 = Effect.raceAll([task1, task2, task3])
```

```typescript
const program3 = Effect.raceFirst(task1, task2).pipe(
  Effect.tap(Console.log("more work...")),
)
await Effect.runPromiseExit(program3)
```

### Interruption
`Effect.interrupt` stops fiber execution immediately; the outcome is captured as an `Interrupt` in the resulting `Exit`. `Effect.onInterrupt(cleanup)` registers a cleanup effect that runs when the effect is interrupted (used above to log `"taskN interrupted"`). Losing effects in a race are interrupted automatically. Interruption cascades: when one concurrent effect fails or is interrupted, sibling concurrent effects are interrupted too.

```typescript
import { Effect, Exit } from "effect"

const program = Effect.gen(function* () {
  console.log("start")
  yield* Effect.sleep("2 seconds")
  return yield* Effect.interrupt
})

const exit = await Effect.runPromiseExit(program)
```

---

## 2. Fibers

A **fiber** is a lightweight, cooperatively-scheduled virtual thread — "the running execution of an Effect." Fibers are how Effect achieves concurrency on a single-threaded JS runtime. As the docs put it: "Virtual threads, or fibers, are logical threads simulated by the Effect runtime."

### Fiber type
```
Fiber<Success, Error>
```
No `Requirements` parameter, since fibers run already-resolved effects (all requirements provided beforehand).

### Fiber lifecycle
- Every effect runs on a fiber — at minimum a "main" fiber created by `runSync`/`runPromise`/`runFork`.
- Each fiber has a unique identity, local state, and status (running, suspended, done).
- A fiber exits with success or failure depending on its effect's outcome.
- Child fibers are tied to the parent's lifetime under **structured concurrency**: "child fibers' lifetimes are tied to their parent." Parent termination cascades to supervised children, preventing resource leaks.

### Forking effects (creating fibers)
- **`Effect.forkChild(effect)`** — creates a supervised child fiber whose lifetime is tied to the parent (the standard, structured way to fork).
  ```typescript
  // Effect<Fiber<number, never>, never, never>
  const fib10Fiber = Effect.forkChild(fib(10))
  ```
- **`Effect.forkDetach(effect)`** — creates a daemon fiber not tied to the parent; runs in the global scope.
- **`Effect.forkScoped(effect)`** — forks into the local `Scope`; the fiber outlives the parent but is terminated when that scope closes.
- **`Effect.forkIn(effect, scope)`** — forks into an explicitly given scope for fine-grained lifecycle control.

### Joining / awaiting / interrupting
- **`Fiber.join(fiber)`** — waits for completion and returns the success value (rethrows on failure).
  ```typescript
  const n = yield* Fiber.join(fiber)
  ```
- **`Fiber.await(fiber)`** — waits and returns an `Exit` describing the outcome instead of throwing.
  ```typescript
  const exit = yield* Fiber.await(fiber) // Exit.succeed(55)
  ```
- **`Fiber.interrupt(fiber)`** — interrupts the fiber and runs its finalizers, waiting for interruption to complete.
  ```typescript
  yield* Fiber.interrupt(fiber)
  ```
- **`fiber.interruptUnsafe()`** — fire-and-forget interruption, does not wait for completion.
- **`Effect.interrupt`** — the higher-level, effect-based interruption API (see Basic Concurrency).

### Interruption model
Effect uses **asynchronous interruption**, not polling. During critical sections a target fiber can disable interruptibility for that region ("during critical sections, the target fiber disables the interruptibility of those regions"), deferring interruption until the region completes.

### Scheduling
Forked fibers begin executing only *after* the current fiber completes or yields control — timing is non-deterministic. `Effect.sleep()` or `Effect.yieldNow()` can create scheduling opportunities, but exact interleaving is never guaranteed.

---

## 3. Deferred

`Deferred<Success, Error>` is a one-shot, single-assignment async primitive: "a one-time variable ... It can only be completed once, making it a useful tool for managing asynchronous operations and synchronization between different parts of your program." Once completed (success or failure), it cannot be changed. Fibers calling `Deferred.await` suspend semantically (no thread blocking) until it's completed.

### Core API
| API | Purpose | Returns |
|---|---|---|
| `Deferred.make<Success, Error>()` | create | `Effect<Deferred<Success, Error>>` |
| `Deferred.await(deferred)` | wait for the value | `Effect<Success, Error>` |
| `Deferred.succeed(deferred, value)` | complete successfully | `Effect<boolean>` |
| `Deferred.fail(deferred, error)` | complete with a typed error | `Effect<boolean>` |
| `Deferred.done(deferred, exit)` | complete with an `Exit` | `Effect<boolean>` |
| `Deferred.complete(deferred, effect)` | complete with an effect's result | `Effect<boolean>` |
| `Deferred.die(deferred, defect)` | complete as a defect | `Effect<boolean>` |
| `Deferred.poll(deferred)` | non-blocking check | `Option<Effect<Success, Error>>` |
| `Deferred.isDone(deferred)` | completion status | `Effect<boolean>` |

Completion methods (`succeed`/`fail`/`done`/`complete`/`die`) return `true` if this call completed the Deferred, `false` if it was already completed.

```typescript
import { Effect, Deferred } from "effect"

const program = Effect.gen(function* () {
  const deferred = yield* Deferred.make<number, string>()
  yield* Deferred.succeed(deferred, 1)
  const value = yield* Deferred.await(deferred)
  console.log(value) // => 1
})

await Effect.runPromise(program)
```

```typescript
import { Effect, Deferred, Fiber } from "effect"

const program = Effect.gen(function* () {
  const deferred = yield* Deferred.make<string, string>()

  const taskA = Effect.gen(function* () {
    yield* Effect.sleep("1 second")
    return yield* Deferred.succeed(deferred, "hello world")
  })

  const taskB = Effect.gen(function* () {
    const value = yield* Deferred.await(deferred)
    return value
  })

  const fiberA = yield* Effect.forkChild(taskA)
  const fiberB = yield* Effect.forkChild(taskB)
  const both = yield* Effect.zip(Fiber.join(fiberA), Fiber.join(fiberB))
  console.log(both) // => [true, "hello world"]
})

await Effect.runPromise(program)
```

Common uses: coordinating fibers (signal completion), synchronization (block until a dependency is ready), work handoff between fibers, and suspending execution until a condition is met.

---

## 4. Queue

A `Queue<A>` is "a lightweight in-memory queue with built-in back-pressure, enabling asynchronous, purely-functional, and type-safe handling of data." Each message taken from a queue goes to exactly one consumer (contrast with PubSub, section 5).

### Strategies / constructors
| API | Behavior when full |
|---|---|
| `Queue.bounded<A>(capacity)` | back-pressures — `Queue.offer` suspends until space is available |
| `Queue.dropping<A>(capacity)` | discards new values silently |
| `Queue.sliding<A>(capacity)` | removes old values to make room for new ones |
| `Queue.unbounded<A>()` | no capacity limit (`capacity === Infinity`) |

```typescript
import { Effect, Queue } from "effect"

const boundedQueue = Queue.bounded<number>(100)
;(await Effect.runPromise(boundedQueue)).capacity // => 100

const droppingQueue = Queue.dropping<number>(100)
const slidingQueue = Queue.sliding<number>(100)
const unboundedQueue = Queue.unbounded<number>()
;(await Effect.runPromise(unboundedQueue)).capacity // => Infinity
```

### Offer / take
```typescript
import { Effect, Queue } from "effect"

const program = Effect.gen(function* () {
  const queue = yield* Queue.bounded<number>(100)
  yield* Queue.offer(queue, 1)
  const value = yield* Queue.take(queue)
  return value
})

await Effect.runPromise(program) // => 1
```

### Other operators
- `Queue.offerAll(queue, values)` — enqueue many values at once.
- `Queue.poll(queue)` — non-blocking take, returns `Option`.
- `Queue.takeBetween(queue, min, max)` — take up to N items without waiting past availability.
- `Queue.takeN(queue, n)` — take exactly N items; suspends if not enough are available.
- `Queue.takeAll(queue)` — drain everything currently available.
- `Queue.shutdown(queue)` — interrupts fibers suspended on the queue and empties it.
- `Queue.await(queue)` — waits for the queue's Done state.

### Type restrictions
- `Enqueue<A>` — offer-only view.
- `Dequeue<A>` — take-only view.
- `Queue<A>` — full read/write interface.

---

## 5. PubSub

A `PubSub<A>` is an asynchronous message broadcast system: unlike a `Queue` (where each message reaches one consumer), "a `PubSub` broadcasts each published message to all subscribers." A subscriber only receives messages published while it is actively subscribed — no replay of earlier messages.

### Constructors / backpressure strategies
| API | Behavior when full |
|---|---|
| `PubSub.bounded<T>(capacity)` | back-pressures publishers — "ensures that all subscribers receive all messages while they are subscribed" |
| `PubSub.dropping<T>(capacity)` | discards new values; `publish` returns `false` when dropped — subscribers not guaranteed all messages |
| `PubSub.sliding<T>(capacity)` | evicts oldest messages for new ones — "prevents slow subscribers from impacting the message delivery rate" |
| `PubSub.unbounded<T>()` | unlimited capacity — recommended only for specific use cases, prefer bounded/dropping/sliding otherwise |

### Publish / subscribe
```typescript
import { Effect, PubSub } from "effect"

const program = Effect.scoped(
  Effect.gen(function* () {
    const pubsub = yield* PubSub.bounded<string>(2)

    const dequeue1 = yield* PubSub.subscribe(pubsub)
    const dequeue2 = yield* PubSub.subscribe(pubsub)

    yield* PubSub.publish(pubsub, "Hello from a PubSub!")

    const message1 = yield* PubSub.take(dequeue1)
    const message2 = yield* PubSub.take(dequeue2)
    // both => "Hello from a PubSub!"
  }),
)

await Effect.runPromise(program)
```

`PubSub.subscribe(pubsub)` is **scoped** — it returns a `Dequeue` and auto-unsubscribes when the enclosing `Scope` closes (hence `Effect.scoped` wrapping the program above).

### Other operators
- `PubSub.publishAll(pubsub, messages)` — publish many messages at once; consume with `PubSub.takeAll(dequeue)`.
- `PubSub.capacity(pubsub)` — synchronous capacity lookup.
- `PubSub.size(pubsub)` — effectful current-size lookup.
- `PubSub.shutdown(pubsub)` / `PubSub.isShutdown(pubsub)` / `PubSub.awaitShutdown(pubsub)` — terminate and observe shutdown of the pubsub and its subscriber queues.

---

## 6. Semaphore

A semaphore is "a synchronization mechanism used to manage access to a shared resource" — "a generalized mutex, allowing a set number of **permits** to be held and released concurrently." Permits act like tickets: a task needs to acquire the required number before running, and waits if not enough are available.

### Core API
- **`Semaphore.make(permits)`** — creates a semaphore with the given number of permits, e.g. `Semaphore.make(3)`.
- **`semaphore.withPermits(n)(effect)`** — wraps an effect so it must acquire `n` permits before running; permits are released automatically afterward, even on failure or interruption.
- **`Semaphore.take(sem, n)`** — lower-level, directly acquire `n` permits.

```typescript
import { Effect, Semaphore } from "effect"

const mutex = Semaphore.make(3)
const acquired = await Effect.runPromise(
  mutex.pipe(Effect.flatMap((sem) => Semaphore.take(sem, 3))),
)
acquired // => 3
```

### Using a one-permit semaphore as a mutex (forces sequential execution)
```typescript
import { Effect, Semaphore } from "effect"

const task = Effect.gen(function* () {
  yield* Effect.log("start")
  yield* Effect.sleep("2 seconds")
  yield* Effect.log("end")
})

const program = Effect.gen(function* () {
  const mutex = yield* Semaphore.make(1)
  const semTask = mutex.withPermits(1)(task).pipe(Effect.withLogSpan("elapsed"))

  // Run 3 tasks concurrently, but they execute sequentially
  // due to the one-permit semaphore
  yield* Effect.all([semTask, semTask, semTask], {
    concurrency: "unbounded",
  })
})

await Effect.runPromise(program)
```

### Weighted permits example
```typescript
const program2 = Effect.gen(function* () {
  const mutex = yield* Semaphore.make(5)

  const tasks = [1, 2, 3, 4, 5].map((n) =>
    mutex
      .withPermits(n)(Effect.delay(Effect.log(`process: ${n}`), "2 seconds"))
      .pipe(Effect.withLogSpan("elapsed")),
  )

  yield* Effect.all(tasks, { concurrency: "unbounded" })
})
```
Each task requests a different number of permits out of the semaphore's 5, so execution order/overlap depends on how many permits are free.

---

## 7. Latch

A `Latch` is a gate for fibers: closed (fibers wait) or open (fibers proceed immediately). Once opened it typically stays open, though it can be closed again. Example use case: "an application that processes requests only after completing initial setup (like loading configuration data or establishing a database connection)" — keep the latch closed during setup, then open it once ready.

### Core API
| API | Purpose |
|---|---|
| `Latch.make()` | create a latch; default closed (`false`), or pass a boolean for initial state |
| `latch.whenOpen(effect)` | run `effect` only once the latch is open — waits if currently closed |
| `latch.open` | open the latch, releasing all waiting fibers, and letting future ones through immediately |
| `latch.close` | close the latch again, causing future fibers to wait |
| `latch.await` | suspend the current fiber until the latch opens |
| `latch.release` | let currently-waiting fibers proceed once, without permanently opening the latch |

```typescript
import { Console, Effect, Fiber, Latch } from "effect"

const program = Effect.gen(function* () {
  const latch = yield* Latch.make()

  const fiber = yield* Console.log("open sesame").pipe(
    latch.whenOpen,
    Effect.forkChild,
  )

  yield* Effect.sleep("1 second")
  yield* latch.open
  yield* Fiber.await(fiber)
})

await Effect.runPromise(program)
```

### Latch vs Semaphore
- **Latch** — gates fibers on a one-time (or togglable) event: "wait until this condition is true."
- **Semaphore** — mutual exclusion / resource limiting: "only N fibers may hold this resource at once."

---

## Cheatsheet

| Primitive | Create | Core ops | Use for |
|---|---|---|---|
| Concurrent `Effect.all`/`forEach` | — | `{ concurrency: number \| "unbounded" }` | Bulk running effects with a concurrency cap |
| Race | — | `Effect.race`, `Effect.raceAll`, `Effect.raceFirst` | First success (or first outcome) wins, losers interrupted |
| Fiber | `Effect.forkChild`/`forkDetach`/`forkScoped`/`forkIn` | `Fiber.join`, `Fiber.await`, `Fiber.interrupt`, `fiber.interruptUnsafe()` | Structured concurrent execution of an Effect |
| `Deferred<A,E>` | `Deferred.make()` | `succeed`, `fail`, `done`, `complete`, `die`, `await`, `poll`, `isDone` | One-shot async handoff between fibers |
| `Queue<A>` | `Queue.bounded/unbounded/dropping/sliding` | `offer`, `offerAll`, `take`, `poll`, `takeN`, `takeBetween`, `takeAll`, `shutdown` | Point-to-point work queue (1 message → 1 consumer) |
| `PubSub<A>` | `PubSub.bounded/unbounded/dropping/sliding` | `publish`, `publishAll`, `subscribe` (scoped), `size`, `capacity`, `shutdown` | Broadcast (1 message → all subscribers) |
| `Semaphore` | `Semaphore.make(permits)` | `withPermits(n)(effect)`, `take` | Limit concurrent access to N permits (mutex when N=1) |
| `Latch` | `Latch.make(initial?)` | `open`, `close`, `await`, `release`, `whenOpen` | Gate fibers until a condition/event occurs |

## Conventions to follow when writing Effect code

- Default to sequential composition; opt into concurrency explicitly via the `{ concurrency }` option on `Effect.all`/`Effect.forEach` rather than hand-rolling fiber orchestration.
- Prefer structured concurrency: fork with `Effect.forkChild` (child tied to parent lifetime) over `Effect.forkDetach`; only detach when a task must genuinely outlive its parent, and prefer `Effect.forkScoped`/`forkIn` when it should be tied to a `Scope` instead.
- Always `Fiber.join`/`Fiber.await` or otherwise supervise forked fibers — don't fork-and-forget unless detachment/daemon behavior is intentional.
- Use `Effect.race`/`raceAll`/`raceFirst` instead of manually forking two effects and racing them by hand; rely on Effect's automatic interruption of the losing side.
- Use `Deferred` instead of manual Promise-based handoff/signaling between fibers — it composes with the rest of the Effect system and is exit-aware.
- Choose the `Queue` strategy deliberately: `bounded` for back-pressure (never drop), `dropping`/`sliding` when producers must not be slowed down, `unbounded` only when capacity truly cannot be bounded.
- Reach for `PubSub` (not multiple `Queue`s) when a message must fan out to every subscriber rather than to exactly one consumer; remember subscriptions are scoped (`Effect.scoped`) and miss messages published before they subscribed.
- Use `Semaphore.make(1)` + `withPermits(1)` as a mutex for serializing access to a shared resource, and larger permit counts to cap real concurrency (e.g. limiting outbound requests) instead of ad hoc counters.
- Use `Latch` to gate startup/readiness (e.g. "don't process requests until setup finishes") rather than polling a boolean `Ref` in a loop.
- Let interruption propagate: use `Effect.onInterrupt` for cleanup instead of suppressing/ignoring interruption, and keep uninterruptible regions (critical sections) as small as possible.
