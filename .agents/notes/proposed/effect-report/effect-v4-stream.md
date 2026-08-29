# Effect v4 — Stream & Sink Notes

Source: https://www.effect.website/docs/v4/stream/introduction and the following pages in the Stream and Sink sections (v4 rc).

Status: research notes, distilled from the official docs.

---

## Part A: Stream

### A1. Introduction

A `Stream<A, E, R>` is a program description that, when executed, can emit **zero or more** values of type `A`, handle errors of type `E`, and operates within a context of type `R`. It generalizes `Effect<A, E, R>`: an `Effect` always produces exactly one result on success (even if that result is itself a collection), while a `Stream` may yield zero, one, many, or infinitely many values over time.

Streams are handy for sequences of values over time — they can replace observables, Node streams, and `AsyncIterable`s.

Typical stream shapes:
- An empty stream
- A single-element stream
- A finite stream of elements
- An infinite stream of elements

```ts
import { Effect, Option, Exit } from "effect"

const failedEffect = Effect.fail("fail!")
const oneNumberValue = Effect.succeed(3)
const oneListValue = Effect.succeed([1, 2, 3])
const oneOption = Effect.succeed(Option.some(1))

await Effect.runPromiseExit(failedEffect) // => Exit.fail("fail!")
```

```ts
import { Stream, Effect } from "effect"

const emptyStream = Stream.empty
const oneNumberValueStream = Stream.succeed(3)
const finiteNumberStream = Stream.range(1, 10)
const infiniteNumberStream = Stream.iterate(1, (n) => n + 1)

await Effect.runPromise(Stream.runCollect(finiteNumberStream))
// => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

### A2. Creating Streams

Common constructors:

- `Stream.make(...values)` — pure stream from varargs: `Stream.make(1, 2, 3)` → `[1, 2, 3]`.
- `Stream.empty` — no values.
- `Stream.succeed(void 0)` — single `undefined` value (general form: `Stream.succeed(a)` emits one value).
- `Stream.fail(e)` — mirrors `Effect.fail`, fails immediately.
- `Stream.range(min, max)` — inclusive integer sequence: `Stream.range(1, 5)` → `[1, 2, 3, 4, 5]`.
- `Stream.iterate(1, (n) => n + 1)` — repeatedly applies a function to a seed, producing `1, 2, 3, ...` (infinite unless combined with `take`/`takeWhile`).
- `Stream.scoped(effect)` — wraps a scoped resource-acquiring `Effect` into a single-valued stream, tying acquisition/release to the stream's scope.

**Array-based:**
- `Stream.fromArray([1, 2, 3])` — single array → stream.
- `Stream.fromArrays([1, 2, 3], [4, 5, 6])` — chains multiple arrays sequentially.

**Effect-based:**
- `Stream.fromEffect(effect)` — turns an `Effect` into a single-element stream.
- `Stream.fromEffectRepeat(effect)` — repeatedly evaluates an effect (e.g. to generate an infinite sequence of random numbers).

**Callback-based (async):**
- `Stream.callback(...)` — adapts callback-style APIs using `Queue` operations: `Queue.offerUnsafe()` to emit elements, `Queue.endUnsafe()` to terminate successfully, `Queue.fail()` to terminate with an error.

**Iterable sources:**
- `Stream.fromIterable(iterable)` — any standard `Iterable`.
- `Stream.fromIterableEffect(effect)` — an `Effect` that produces an `Iterable` (e.g. a DB query result).
- `Stream.fromAsyncIterable(asyncIterable, onError)` — handles async generators, with a custom error mapper.

**Repetition:**
- `Stream.forever(Stream.succeed(0))` — endlessly repeats a stream's content.
- `Stream.repeat(stream, schedule)` — repeats according to a `Schedule`.
- `Stream.tick(duration)` — emits `void` at regular intervals.

**Unfolding / pagination:**
- `Stream.unfold(1, (n) => Effect.succeed([n, n + 1]))` — generates a sequence from a state-stepping function returning `[emittedValue, nextState]`.
- `Stream.paginate(...)` — like `unfold` but each step can emit a batch of values plus an optional continuation state; suited to paginated APIs.

**Queue / PubSub / Schedule:**
- `Stream.fromQueue(queue)`, `Stream.fromPubSub(pubsub)` — turn these async messaging primitives into streams.
- `Stream.fromSchedule(schedule)` — emits a value for each scheduled occurrence.

### A3. Consuming Streams

- **`Stream.runCollect`** — gathers all elements into an array (result wrapped in an `Effect`, run it to get the array):
  ```ts
  import { Stream, Effect } from "effect"

  const stream = Stream.make(1, 2, 3, 4, 5)
  const collectedData = Stream.runCollect(stream)
  await Effect.runPromise(collectedData) // => [1, 2, 3, 4, 5]
  ```

- **`Stream.runForEach`** — runs a callback per element, discarding results:
  ```ts
  const effect = Stream.make(1, 2, 3).pipe(Stream.runForEach((n) => Console.log(n)))
  await Effect.runPromise(effect) // => undefined
  ```

- **`Stream.runFold`** — reduces the stream's values into a single result:
  ```ts
  const foldedStream = Stream.make(1, 2, 3, 4, 5).pipe(
    Stream.runFold(() => 0, (a, b) => a + b),
  )
  await Effect.runPromise(foldedStream) // => 15
  ```
  For early termination based on a running accumulator, use `Stream.runForEachWhile` inside `Effect.suspend` with a local mutable accumulator:
  ```ts
  const foldedWhileStream = Effect.suspend(() => {
    let acc = 0
    return Stream.make(1, 2, 3, 4, 5)
      .pipe(
        Stream.runForEachWhile((n) => {
          acc = acc + n
          return Effect.succeed(acc <= 3)
        }),
      )
      .pipe(Effect.map(() => acc))
  })
  await Effect.runPromise(foldedWhileStream) // => 6
  ```

- **Consuming with a `Sink`** — pass a `Sink` to `Stream.run`:
  ```ts
  const effect = Stream.make(1, 2, 3).pipe(Stream.run(Sink.sum))
  await Effect.runPromise(effect) // => 6
  ```

### A4. Error Handling

- **`Stream.catch(stream, handler)`** — recovers from a stream failure by switching to an alternative stream. The handler receives the error value and returns a replacement `Stream`.
  ```ts
  const s1 = Stream.make(1, 2, 3).pipe(
    Stream.concat(Stream.fail("Oh! Error!")),
    Stream.concat(Stream.make(4, 5)),
  )
  const s2 = Stream.make("a", "b", "c")
  const stream = Stream.catch(s1, () => s2)
  await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3, "a", "b", "c"]
  ```
  Can branch on the error value to choose between multiple recovery streams (switch/case on the error), and can be combined with `Result.succeed`/`Result.fail` to tag which elements came from the fallback path.

- **`Stream.catchCause(stream, handler)`** — like `catch`, but handles the full `Cause` (including **defects**, e.g. from `Stream.die`), not just expected failures.

- **Selective recovery** — `Stream.catchFilter(stream, Filter.fromPredicate(...), handler)` recovers only errors matching a predicate; `Stream.catchCauseFilter(stream, Cause.findDie, handler)` does the same over causes (e.g. only recovering from a matched defect).

- **`Stream.onError(stream, cleanupEffect)`** — runs an effect when the stream fails, then **re-raises the original failure**. Use for cleanup/diagnostics, not recovery.

- **`Stream.retry(stream, schedule)`** — retries a failing stream per a `Schedule` (e.g. `Schedule.exponential("1 second")`), typically applied to a sub-stream built from `Stream.fromEffect` so only that portion is retried.

- **Refining errors** — inside `Stream.catch`, inspect the error and decide: return `Stream.fail(narrowedError)` to keep it as a recoverable stream error, or `Stream.die(error)` to convert it into a defect (unrecoverable via `catch`, only via `catchCause`).

- **Timing out:**
  - `Stream.timeout(duration)` — terminates (empties) the stream if no value is produced within the duration:
    ```ts
    const stream = Stream.fromEffect(Effect.never).pipe(Stream.timeout("2 seconds"))
    await Effect.runPromise(Stream.runCollect(stream)) // => []
    ```
  - `Stream.timeoutOrElse({ duration, orElse })` — like `timeout`, but instead of silently ending, runs `orElse` on timeout. `orElse` can return `Stream.fail(...)`, `Stream.failCause(Cause.die(...))`, or a replacement stream (e.g. `Stream.make(1, 2, 3)`).

### A5. Operations

- **Tapping** — `Stream.tap(f)` runs a side effect per element without changing values (good for logging mid-pipeline).

- **Taking elements:**

  | API | Purpose |
  |---|---|
  | `take` | fixed number of elements |
  | `takeWhile` | while a predicate holds |
  | `takeUntil` | until a predicate is met |
  | `takeRight` | last N elements |

- **Mapping:**
  - `Stream.map(f)` — plain transform.
  - Map to a constant value.
  - `Stream.mapEffect(f)` — effectful transform per element, with concurrency options.
  - `Stream.mapAccum(...)` — stateful transform carrying an accumulator across elements.
  - `Stream.flattenIterable` — maps each element to an iterable and flattens.

- **Filtering** — `Stream.filter(predicate)` keeps only matching elements.

- **Scanning** — cumulative fold emitting every intermediate result:
  ```ts
  Stream.range(1, 5).pipe(Stream.scan(0, (a, b) => a + b))
  // => [0, 1, 3, 6, 10, 15]
  ```

- **Draining** — `Stream.drain` runs the stream's effects but discards all values, producing an empty stream.

- **Change detection** — `Stream.changes` emits only elements that differ from the immediately preceding one (dedupes consecutive repeats).

- **Combining streams:**
  - Zipping: `Stream.zip`, `Stream.zipWith` (custom combiner), `Stream.zipLatest`/`Stream.zipLatestWith` (combine at differing emission rates), `Stream.zipWithPrevious`/`zipWithNext`/`zipWithPreviousAndNext` (pair with neighbors), `Stream.zipWithIndex` (pair with position).
  - `Stream.cross` — Cartesian product of two streams.
  - Partitioning: `Stream.partition` (by predicate, into two substreams), `Stream.partitionEffect` (effectful predicate).
  - Grouping: `Stream.groupByKey` (by key fn), `Stream.groupBy` (effectful partitioning), `Stream.grouped` (fixed-size chunks), `Stream.groupedWithin` (chunk by size OR time interval, whichever first).
  - Concatenation: `Stream.concat` (join two streams sequentially), `Stream.flatten` (stream-of-streams → stream), `Stream.flatMap` (map to streams and concatenate, with concurrency/switch options).
  - Merging: `Stream.merge` interleaves elements from two sources; termination strategy option: `"left"`, `"right"`, `"both"` (default), `"either"`.
  - Interleaving: `Stream.interleave` (alternate single elements), `Stream.interleaveWith` (boolean-stream-driven pattern).
  - Interspersing: `Stream.intersperse` (insert delimiter between elements), `Stream.intersperseAffixes` (add start/middle/end affixes).

- **Advanced:**
  - `Stream.broadcastN` — fan out to multiple downstream consumers receiving identical elements, with capacity control.
  - `Stream.buffer` — queues elements ahead of a consumer; strategies: bounded (fixed capacity), unbounded, sliding (drop oldest), dropping (drop newest).
  - `Stream.debounce` — delays emission until a pause occurs, resetting the timer on each new value.
  - `Stream.throttle` — token-bucket rate limiting; `"shape"` strategy delays chunks to fit bandwidth, `"enforce"` strategy discards exceeding chunks, plus a `burst` option for temporary bursts.
  - `Stream.schedule` — inserts time delays between emissions per a `Schedule`.
  - `Stream.toPull` — returns an `Effect` that pulls the next chunk on each invocation, failing with `Cause.Done` on stream completion; useful for manual/loop-based consumption.

### A6. Resourceful Streams

Resources acquired for a stream must stay open for the **entire period the stream is consumed**, not just during acquisition.

- **Acquire/release pattern** — combine `Effect.acquireRelease` with `Stream.fromEffect`, wrapped in `Stream.scoped`, so the resource's scope matches the stream's consumption lifetime:
  ```ts
  import { Stream, Console, Effect } from "effect"

  const open = (filename: string) =>
    Effect.gen(function* () {
      yield* Console.log(`Opening ${filename}`)
      return {
        getLines: Effect.succeed(["Line 1", "Line 2", "Line 3"]),
        close: Console.log(`Closing ${filename}`),
      }
    })

  const stream = Stream.scoped(
    Stream.fromEffect(
      Effect.acquireRelease(open("file.txt"), (file) => file.close),
    ),
  ).pipe(Stream.flatMap((file) => Stream.fromIterableEffect(file.getLines)))

  await Effect.runPromise(Stream.runCollect(stream)) // => ["Line 1", "Line 2", "Line 3"]
  ```
  Because `Effect.acquireRelease` registers its cleanup in the scope created by `Stream.scoped`, the file stays open for as long as downstream consumes it (e.g. while `Stream.fromIterableEffect` emits its contents), and is closed automatically afterward.

- **`Stream.ensuring(stream, finalizer)`** — runs a finalizer effect **after** the stream's own finalizers, regardless of whether the stream succeeded, failed, or was interrupted:
  ```ts
  const application = Stream.fromEffect(Console.log("Application Logic."))
  const deleteDir = (dir: string) => Console.log(`Deleting dir: ${dir}`)
  const program = application.pipe(
    Stream.ensuring(
      deleteDir("tmp").pipe(Effect.andThen(Console.log("Temporary directory was deleted."))),
    ),
  )
  await Effect.runPromise(Stream.runCollect(program)) // => [undefined]
  ```

---

## Part B: Sink

### B1. Introduction

A `Sink` consumes elements produced by a `Stream`. Type signature:

```
Sink<A, In, L, E, R>
```

| Param | Meaning |
|---|---|
| `A` | result the sink produces |
| `In` | element type the sink consumes |
| `L` | leftover element type (unconsumed remainder) |
| `E` | possible error type |
| `R` | required context/dependencies |

A sink can consume zero, one, or many `In` elements, may fail with `E`, produces a final `A`, and may return leftover `L` elements it didn't consume.

Example: `Sink.take<number>(2)` applied to `Stream.make(1, 2, 3)` yields `[1, 2]` and has type `Sink<Array<number>, number, number, never, never>` — result is `Array<number>`, consumes `number`s, leftovers are `number`s, no errors, no dependencies.

Sinks are run against a stream via `Stream.run(sink)`.

### B2. Creating Sinks

- `Sink.head<A>()` — first element, wrapped in `Some`, or `None` if the stream was empty.
- `Sink.last<A>()` — final element, `Some`/`None` similarly.
- `Sink.count` — counts all consumed elements.
- `Sink.sum` — sums numeric input values.
- `Sink.take<A>(n)` — takes exactly `n` values, returns them as an array.
- `Sink.drain` — ignores/discards all inputs.
- `Sink.timed` — executes the stream and measures execution time as a `Duration`.
- `Sink.forEach(f)` — runs an effectful function `f` for every element fed to it.
- `Sink.succeed(a)` — succeeds immediately with `a` without consuming any upstream elements.
- `Sink.fail(e)` — fails immediately without consuming any elements.

**Collecting:**
- `Sink.collect` — gathers all elements into an array, in emission order.
- `Sink.takeWhile(predicate)` — collects elements until the predicate returns `false`.
- `Sink.reduce(...)` — accumulates using an initial value and a reduction function.
- `Sink.reduceWhile(...)` — folds with a specified maximum size / continuation condition.

**Folding:**
- `Sink.fold(...)` — folds elements, stopping once a specific condition is met.
- `Sink.foldUntil(...)` — accumulates up to a specified element-count limit.
- `Sink.foldWeighted(...)` — accumulates based on a custom "weight"/"cost" function per element rather than a raw count.

### B3. Operations

- **`Sink.mapInput(f)`** — adapts what the sink *accepts* by transforming input values before they reach it (contrast with `Sink.map`, which transforms the sink's *output*):
  ```ts
  const stringSum = numericSum.pipe(
    Sink.mapInput((s: string) => Number.parseFloat(s)),
  )
  // Result: 15
  ```

- **Transforming both input and output** — chain `Sink.mapInput` and `Sink.map` to convert types on both ends:
  ```ts
  const sumSink = Sink.sum.pipe(
    Sink.mapInput((s: string) => Number.parseFloat(s)),
    Sink.map((n) => String(n)),
  )
  // Result: "15"
  ```

- **Filtering input** — done upstream via `Stream.filter` combined with `Stream.transduce`, e.g. filtering positive numbers then chunking into groups of three before they reach a sink, producing nested arrays like `[[1, 1, 3], [4, 2, 1], [1, 1, 6], []]`.

### B4. Leftovers

Sinks may consume only part of the available elements, leaving unconsumed "leftovers."

- **Collecting leftovers** — `Sink.mapEnd(...)` transforms both the sink's result and its optional leftover elements, letting you fold leftovers into the final output:
  ```ts
  import { Stream, Sink, Effect, Option } from "effect"

  const stream = Stream.make(1, 2, 3, 4, 5)

  // Take the first 3 elements and collect any leftovers
  const sink1 = Sink.take<number>(3).pipe(
    Sink.mapEnd(([a, leftover]) => [[a, leftover ?? []] as const]),
  )
  await Effect.runPromise(Stream.run(stream, sink1)) // => [[1, 2, 3], [4, 5]]

  // Take only the first element and collect the rest as leftovers
  const sink2 = Sink.head<number>().pipe(
    Sink.mapEnd(([a, leftover]) => [[a, leftover ?? []] as const]),
  )
  await Effect.runPromise(Stream.run(stream, sink2)) // => [Option.some(1), [2, 3, 4, 5]]
  ```

- **Ignoring leftovers** — `Sink.ignoreLeftover` discards unconsumed elements when they aren't needed:
  ```ts
  const sink = Sink.take<number>(3).pipe(
    Sink.ignoreLeftover,
    Sink.mapEnd(([a, leftover]) => [[a, leftover ?? []] as const]),
  )
  await Effect.runPromise(Stream.run(stream, sink)) // => [[1, 2, 3], []]
  ```

---

## Cheatsheet

| API | Given | Result |
|---|---|---|
| `Stream.make` | values | `Stream<A>` |
| `Stream.range` | `min, max` | `Stream<number>` (inclusive) |
| `Stream.iterate` | `seed, f` | `Stream<A>` (infinite) |
| `Stream.fromEffect` | `Effect<A,E,R>` | `Stream<A,E,R>` (single element) |
| `Stream.fromIterable` | `Iterable<A>` | `Stream<A>` |
| `Stream.scoped` | scoped `Effect<A,E,R>` | `Stream<A,E,R>` |
| `Stream.runCollect` | `Stream<A,E,R>` | `Effect<Array<A>,E,R>` |
| `Stream.runForEach` | `Stream<A,E,R>`, `A => Effect` | `Effect<void,E,R>` |
| `Stream.runFold` | `Stream<A,E,R>`, seed, `(acc,A)=>acc` | `Effect<acc,E,R>` |
| `Stream.run` | `Stream<A,E,R>`, `Sink<B,A,L,E2,R2>` | `Effect<B, E\|E2, R\|R2>` |
| `Stream.catch` | `Stream`, `E => Stream<B>` | recovers expected errors |
| `Stream.catchCause` | `Stream`, `Cause<E> => Stream<B>` | recovers errors + defects |
| `Stream.retry` | `Stream`, `Schedule` | retried stream |
| `Stream.timeout` | `Stream`, duration | ends stream on inactivity |
| `Stream.map` / `mapEffect` | `Stream<A>`, `A => B` / `A => Effect<B>` | `Stream<B>` |
| `Stream.filter` | `Stream<A>`, predicate | `Stream<A>` |
| `Stream.merge` | two `Stream`s | interleaved `Stream` |
| `Stream.concat` | two `Stream`s | sequential `Stream` |
| `Sink.take` | `n` | `Sink<Array<A>, A, A>` |
| `Sink.sum` / `count` | — | `Sink<number, number>` |
| `Sink.fold` / `foldUntil` / `foldWeighted` | seed, combine | accumulating `Sink` |
| `Sink.mapInput` | `Sink`, `In2 => In` | `Sink` accepting `In2` |
| `Sink.mapEnd` | `Sink`, `[A, leftover] => B` | `Sink` folding in leftovers |
| `Sink.ignoreLeftover` | `Sink` | `Sink` discarding leftovers |

## Conventions to follow when writing Effect code

- Prefer `Stream` over ad-hoc async iterables/observables/Node streams when values arrive over time or in a sequence — its error and resource-safety guarantees compose with the rest of Effect.
- Use `Stream.scoped` + `Effect.acquireRelease` for any stream backed by a resource (file handle, connection, subscription) so cleanup is guaranteed for the full consumption lifetime, not just acquisition.
- Prefer `Stream.catch`/`Stream.catchFilter` for expected, recoverable errors; reserve `Stream.catchCause`/`Stream.catchCauseFilter` for defects. Use `Stream.onError` only for cleanup/diagnostics, never to swallow failures.
- When consuming, pick the narrowest tool: `Stream.runForEach` for side effects, `Stream.runFold`/`Sink.reduce`-family for aggregation, `Stream.runCollect` only when you actually need the full array in memory.
- Reach for a `Sink` (via `Stream.run`) instead of hand-rolled fold logic when the consumption logic is reusable or needs to report leftovers.
- Use `Sink.mapInput`/`Sink.map` to adapt sink boundaries rather than pre-transforming the whole stream, when the transform is sink-specific.
- Decide explicitly whether leftovers matter: use `Sink.mapEnd` to surface them, or `Sink.ignoreLeftover` to make the discard intentional and visible in code.
