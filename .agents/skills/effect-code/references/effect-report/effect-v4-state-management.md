# Effect v4 — State Management Notes

Source: https://www.effect.website/docs/v4/state-management/ref, https://www.effect.website/docs/v4/state-management/synchronizedref, https://www.effect.website/docs/v4/state-management/subscriptionref

Status: research notes, distilled from the official docs.

---

## 1. Ref

`Ref` is a mutable reference used for safe state management in Effect programs. "State" here means any data that can change as the program runs. Unlike a plain mutable variable, `Ref` gives "a controlled way to handle mutable state and safely update it in a concurrent environment."

Key points:
- **All operations are effectful** — reading or writing a `Ref` produces an `Effect`, so it's tracked and composed like any other effect.
- **Safe under concurrency** — multiple fibers can update the same `Ref` and the updates stay consistent despite non-deterministic interleaving.
- **Enables fiber communication** — one fiber can write while another reads, e.g. one fiber updating state from external input while another consumes it.

### Core API
- `Ref.make(initialValue)` — create a `Ref<A>` from an initial value.
- `Ref.get(ref)` — read the current value.
- `Ref.update(ref, f)` — transform the value with `f: A => A`.

### Basic example — Counter built from a Ref
```ts
import { Effect, Ref } from "effect"

class Counter {
  inc: Effect.Effect<void>
  dec: Effect.Effect<void>
  get: Effect.Effect<number>

  constructor(private value: Ref.Ref<number>) {
    this.inc = Ref.update(this.value, (n) => n + 1)
    this.dec = Ref.update(this.value, (n) => n - 1)
    this.get = Ref.get(this.value)
  }
}

const make = Effect.map(Ref.make(0), (value) => new Counter(value))

await Effect.runPromise(
  Effect.gen(function* () {
    const counter = yield* make
    yield* counter.inc
    yield* counter.inc
    return yield* counter.get
  }),
) // => 2
```

### Ref as a service
A `Ref` can be threaded through a program via Effect's dependency-injection (`Context.Service` + `Effect.provideServiceEffect`) instead of being passed around explicitly — useful for sharing one piece of state across independent subprograms.

```ts
import { Effect, Context, Ref } from "effect"

// Create a service key for our state
class MyState extends Context.Service<MyState, Ref.Ref<number>>()("MyState") {}

// Subprogram 1: Increment the state value twice
const subprogram1 = Effect.gen(function* () {
  const state = yield* MyState
  yield* Ref.update(state, (n) => n + 1)
  yield* Ref.update(state, (n) => n + 1)
})

// Subprogram 2: Decrement and increment
const subprogram2 = Effect.gen(function* () {
  const state = yield* MyState
  yield* Ref.update(state, (n) => n - 1)
  yield* Ref.update(state, (n) => n + 1)
})

// Subprogram 3: Read and log
const subprogram3 = Effect.gen(function* () {
  const state = yield* MyState
  const value = yield* Ref.get(state)
  console.log(`MyState has a value of ${value}.`)
})

// Compose and provide service
const program = Effect.gen(function* () {
  yield* subprogram1
  yield* subprogram2
  yield* subprogram3
})

const initialState = Ref.make(0)
const runnable = program.pipe(
  Effect.provideServiceEffect(MyState, initialState),
)

Effect.runPromise(runnable)
```

Note: the docs page focuses on `make`/`get`/`update` in its examples; `modify` and `updateAndGet` exist on `Ref` conceptually (as in earlier Effect versions) but were not shown with worked examples on this v4 page — verify signatures against the API reference before relying on them.

---

## 2. SynchronizedRef

`SynchronizedRef<A>` is a mutable reference for storing immutable data with **atomic, effectful** updates. It's "useful when you need to execute effects, such as querying a database, and then update shared state based on the result" — i.e. the update function itself can be an `Effect`, not just a pure function.

### Key distinction from Ref
The defining addition is `updateEffect`: it takes an effectful transformation `A => Effect<A, E, R>` and applies it atomically. Even when many tasks call `updateEffect` concurrently, each update runs to completion (in sequence relative to the ref) before the next one starts — the ref serializes effectful updates instead of racing them.

### Example — accumulating results from concurrent effectful updates
```ts
import { Effect, SynchronizedRef } from "effect"

// Simulated API to get user age
const getUserAge = (userId: number) =>
  Effect.succeed(userId * 10).pipe(Effect.delay(10 - userId))

const meanAge = Effect.gen(function* () {
  // Initialize a SynchronizedRef to hold an array of ages
  const ref = yield* SynchronizedRef.make<number[]>([])

  // Helper function to log state before each effect
  const log = <R, E, A>(label: string, effect: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const value = yield* SynchronizedRef.get(ref)
      yield* Effect.log(label, value)
      return yield* effect
    })

  const task = (id: number) =>
    log(
      `task ${id}`,
      SynchronizedRef.updateEffect(ref, (sumOfAges) =>
        Effect.gen(function* () {
          const age = yield* getUserAge(id)
          return sumOfAges.concat(age)
        }),
      ),
    )

  // Run tasks concurrently with a limit of 2 concurrent tasks
  yield* Effect.all([task(1), task(2), task(3), task(4)], {
    concurrency: 2,
  })

  // Retrieve the updated value
  const value = yield* SynchronizedRef.get(ref)
  return value
})

Effect.runPromise(meanAge).then(console.log) // [ 10, 20, 30, 40 ]
```

Despite `concurrency: 2` letting tasks race to call `updateEffect`, the final array is deterministic (`[10, 20, 30, 40]`) — each effectful update is applied atomically against the current state, one at a time.

`SynchronizedRef` shares `get`/`set`-style operations with `Ref`; `modifyEffect` also exists as the effectful counterpart to `Ref.modify` (compute a new state plus a return value via an effect) — confirm exact signature in the API reference when using it, as the docs page emphasizes `updateEffect` in its worked example.

---

## 3. SubscriptionRef

`SubscriptionRef<A>` is a specialized form built on top of `SynchronizedRef` that adds the ability to **observe** state changes reactively, not just read/write them. It "allows us to subscribe and receive updates on the current value and any changes made to that value."

### Relationship to Ref / SynchronizedRef
- All standard operations (`get`, `set`, `modify`, ...) work exactly as on a regular `Ref`.
- It adds a `changes` stream: subscribing to `changes` immediately emits the *current* value, then emits every subsequent update. Multiple subscribers can observe the same `SubscriptionRef` independently, each seeing the current value at subscription time plus everything after.

### Core API
- `SubscriptionRef.make(initialValue)` — create the ref.
- `SubscriptionRef.changes(ref)` — get a `Stream<A>` of the current value + all future updates.
- Plus the usual `get` / `set` / `update` / `modify` from `Ref`/`SynchronizedRef`.

### Example — server mutating state, multiple clients observing it
```ts
import { Effect, Stream, Random, SubscriptionRef, Fiber } from "effect"

// Server function that increments a shared value forever
const server = (ref: SubscriptionRef.SubscriptionRef<number>) =>
  SubscriptionRef.update(ref, (n) => n + 1).pipe(Effect.forever)

// Client function that observes the stream of changes
const client = (changes: Stream.Stream<number>) =>
  Effect.gen(function* () {
    const n = yield* Random.nextIntBetween(1, 10)
    const chunk = yield* Stream.runCollect(Stream.take(changes, n))
    return chunk
  })

const program = Effect.gen(function* () {
  // Create a SubscriptionRef with an initial value of 0
  const ref = yield* SubscriptionRef.make(0)

  // Fork the server to run concurrently
  const serverFiber = yield* Effect.forkChild(server(ref))

  // Create 5 clients that subscribe to the changes stream
  const clients = new Array(5)
    .fill(null)
    .map(() => client(SubscriptionRef.changes(ref)))

  // Run all clients concurrently and collect their results
  const chunks = yield* Effect.all(clients, { concurrency: "unbounded" })

  // Interrupt the server when clients are done
  yield* Fiber.interrupt(serverFiber)

  // Output the results collected by each client
  for (const chunk of chunks) {
    console.log(chunk)
  }
})

Effect.runPromise(program)
```

### Typical usage
Model shared state where multiple independent observers must react to changes — e.g. UI components reacting to application state, or any functional-reactive-programming pattern where you need both "current snapshot" and "live updates" from one source of truth.

---

## Cheatsheet — Ref family

| Type | Creation | Read | Write (pure) | Write (effectful) | Observe changes |
|---|---|---|---|---|---|
| `Ref<A>` | `Ref.make(a)` | `Ref.get(ref)` | `Ref.update(ref, f)` (also `modify`, `updateAndGet` — verify in API ref) | — | — |
| `SynchronizedRef<A>` | `SynchronizedRef.make(a)` | `SynchronizedRef.get(ref)` | same as `Ref` | `SynchronizedRef.updateEffect(ref, f)` (`f: A => Effect<A>`), atomic/serialized (also `modifyEffect`) | — |
| `SubscriptionRef<A>` | `SubscriptionRef.make(a)` | `SubscriptionRef.get(ref)` (or `.value`) | same as `Ref`/`SynchronizedRef` | same as `SynchronizedRef` | `SubscriptionRef.changes(ref)` → `Stream<A>` (current value + all future updates) |

## Conventions to follow when writing Effect code
- Use `Ref` for plain mutable state shared across fibers; never reach for a raw closure variable when fibers can race on it.
- Use `SynchronizedRef` (and `updateEffect`/`modifyEffect`) when an update needs to run an effect (e.g. a DB call) as part of computing the new state — this keeps the update atomic instead of racing reads/writes around the effect.
- Use `SubscriptionRef` when other parts of the program need to react to state changes over time, not just read the latest value — subscribe via `changes` and compose with `Stream` operators.
- Thread a `Ref` through a program via `Context.Service` + `Effect.provideServiceEffect` when multiple independent subprograms need access to the same state, instead of passing it as a plain argument everywhere.
- All `Ref`/`SynchronizedRef`/`SubscriptionRef` operations return `Effect`s — compose them with `Effect.gen`/`pipe` like any other effect; don't try to read/write them outside the Effect system.
