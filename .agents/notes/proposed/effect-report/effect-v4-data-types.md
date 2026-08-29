# Effect v4 — Data Types Notes

Source: https://www.effect.website/docs/v4/data-types/ (v4 rc) — BigDecimal, Cause, Chunk, Data, DateTime, Duration, Result, Exit, HashSet, Option, Redacted sub-pages.

Status: research notes, distilled from the official docs.

---

## 1. BigDecimal

Precision arithmetic for TypeScript, avoiding floating-point rounding errors (e.g. `0.1 + 0.2 !== 0.3`). Internally: a `BigInt` value plus an integer `scale`; represented number = `value x 10^-scale`. Max precision ~2^63 decimal places.

### Construction
```ts
const decimal = BigDecimal.make(1n, 2)          // 0.01
const decimal2 = BigDecimal.fromBigInt(10n)     // scale 0
const opt = BigDecimal.fromString("0.02")       // Option<BigDecimal>
const unsafe = BigDecimal.fromStringUnsafe("0.02") // throws on invalid input
BigDecimal.fromNumberUnsafe(123.456)            // BigDecimal.make(123456n, 3); throws for non-finite
```

### Operations
- Arithmetic: `sum`, `subtract`, `multiply`, `divide` (→ `Option<BigDecimal>`), `divideUnsafe` (throws on /0), `remainder`/`remainderUnsafe`, `negate`, `abs`, `sign`.
- Comparison: `isLessThan`, `isLessThanOrEqualTo`, `isGreaterThan`, `isGreaterThanOrEqualTo`, `min`, `max`.
- Predicates: `isZero`, `isPositive`, `isNegative`, `isInteger`, `between({ minimum, maximum })`.
- `normalize` strips trailing zeros/adjusts scale; `equals` compares numeric value regardless of internal representation (`BigDecimal.make(105n, 2)` equals `BigDecimal.make(1050n, 3)`).
- Formatting: `String()`, `BigDecimal.format()` (decimal notation), `BigDecimal.toExponential()`.

```ts
const dec1 = BigDecimal.fromStringUnsafe("1.05")
const dec2 = BigDecimal.fromStringUnsafe("2.10")
BigDecimal.sum(dec1, dec2)      // BigDecimal(3.15)
BigDecimal.multiply(dec1, dec2) // BigDecimal(2.205)
```

### When to reach for it
Use `BigDecimal` instead of `number` for money, financial totals, or any calculation where decimal-fraction accuracy matters. Plain `number` is fine for approximate/non-critical math.

---

## 2. Cause

`Cause<E>` captures everything that can go wrong in an Effect workflow beyond the plain `E` error channel: unexpected defects, interruption, and (conceptually) trace info. It's the structured failure model that `Exit`'s failure branch wraps.

### Variants
- **Empty** — no errors (empty reasons array).
- **Fail** — an expected error of type `E`. `Cause.fail(e)`.
- **Die** — an unexpected defect. `Cause.die(defect)`.
- **Interrupt** — fiber interruption, carries the interrupted fiber's numeric ID. `Cause.interrupt(fiberId)`.

### Construction / combination
```ts
const die = Effect.failCause(Cause.die("Boom!"))
const fail = Effect.failCause(Cause.fail("Oh no!"))
```
`Cause.combine(cause1, cause2)` merges two causes.

### Operations
- `Effect.exit()` surfaces the `Cause` on failure.
- Guards: `Cause.hasFails`, `Cause.hasDies`, `Cause.hasInterrupts`, `Cause.hasInterruptsOnly`.
- Reason-level guards: `Cause.isFailReason`, `Cause.isDieReason`, `Cause.isInterruptReason`.
- `Cause.pretty()` — human-readable formatting for debugging.
- Manual inspection: iterate `cause.reasons`, `switch`/`if` on `reason._tag`.

```ts
for (const reason of cause.reasons) {
  if (Cause.isFailReason(reason)) {
    console.log(reason.error.message)
  }
}
```

### When to reach for it
Use `Cause` (via `Exit`/`Effect.exit`) instead of a plain `Error` object whenever you need to distinguish "the program failed with an expected error" from "the program died unexpectedly" or "the fiber was interrupted" — a bare `try/catch` cannot make that distinction.

---

## 3. Chunk

`Chunk<A>` is an immutable, ordered collection optimized for functional-style manipulation, in particular repeated concatenation (which is costly on plain arrays due to copying).

### When to use vs Array
- Use `Chunk` for repeated concatenation, or when you need immutability guarantees under concurrent/fiber-based code.
- Avoid `Chunk` for simple, one-off cases — it adds overhead that isn't worth it there.

### Construction
```ts
const empty = Chunk.empty<number>()
Chunk.toReadonlyArray(empty) // []

const chunk = Chunk.make(1, 2, 3)
Chunk.toReadonlyArray(chunk) // [1, 2, 3]

const fromArray = Chunk.fromIterable([1, 2, 3])
const fromSet = Chunk.fromIterable(new Set([1, 2, 3]))

const unsafe = Chunk.fromArrayUnsafe([1, 2, 3]) // wraps array directly, no copy
```

### Operations
```ts
const appended = Chunk.appendAll(Chunk.make(1, 2), Chunk.make("a", "b"))
Chunk.toReadonlyArray(appended) // [1, 2, "a", "b"]

const dropped = Chunk.drop(Chunk.make(1, 2, 3, 4), 2)
Chunk.toReadonlyArray(dropped) // [3, 4]

Equal.equals(Chunk.make(1, 2), Chunk.make(1, 2)) // true — structural equality

const array = Chunk.toReadonlyArray(chunk) // convert back to array
```

---

## 4. Data

The `Data` module provides constructors for value types with built-in structural equality/hashing (via `Equal`), so you don't need to hand-roll `equals`/`hashCode`.

### Baseline: plain objects already get structural equality
```ts
const alice = { name: "Alice", age: 30 }
Equal.equals(alice, { name: "Alice", age: 30 }) // true
```
This extends to nested objects, arrays, and tuples automatically — `Data` constructors are about ergonomics (tags, classes) more than "turning on" equality.

### Data.Class / Data.TaggedClass
```ts
class Person extends Data.Class<{ name: string }> {}
const alice = new Person({ name: "Alice" })
Equal.equals(alice, new Person({ name: "Alice" })) // true

class PersonTagged extends Data.TaggedClass("Person")<{ name: string }> {}
const bob = new PersonTagged({ name: "Bob" })
bob._tag // "Person"
```
Classes support normal getters/methods.

### Data.TaggedEnum — discriminated unions
```ts
type RemoteData = Data.TaggedEnum<{
  Loading: {}
  Success: { readonly data: string }
  Failure: { readonly reason: string }
}>

const { Loading, Success, Failure, $is, $match } = Data.taggedEnum<RemoteData>()
const state1 = Loading()
const state2 = Success({ data: "test" })

const isLoading = $is("Loading")
isLoading(state1) // true

const matcher = $match({
  Loading: () => "this is a Loading",
  Success: ({ data }) => `this is a Success: ${data}`,
  Failure: ({ reason }) => `this is a Failure: ${reason}`,
})
```
Generic tagged enums use `Data.TaggedEnum.WithGenerics<N>` plus an interface with `this["A"]`/`this["B"]` type params.

### Errors: Data.Error / Data.TaggedError
```ts
class NotFound extends Data.Error<{ message: string; file: string }> {}
const err = new NotFound({ message: "Cannot find this file", file: "foo.txt" })

// works directly in Effect.gen without Effect.fail:
const program = Effect.gen(function* () {
  yield* new NotFound({ message: "Cannot find this file", file: "foo.txt" })
})

class NotFoundTagged extends Data.TaggedError("NotFound")<{
  message: string
  file: string
}> {}
Effect.catchTag("NotFound", (err) => Console.error(`${err.message} (${err.file})`))
```
Errors support a native `cause` field: `class MyError extends Data.Error<{ cause: Error }> {}`.

### When to reach for it
Use `Data.TaggedClass`/`Data.TaggedError` instead of plain object literals or bare `class X extends Error` whenever the value needs to be (a) compared by structural equality, or (b) matched on a `_tag` — e.g. anywhere you plan to use `Effect.catchTag` or a `$match`-style exhaustive switch.

---

## 5. DateTime

Immutable date-time type with first-class timezone support, replacing ad-hoc use of the mutable, timezone-naive built-in `Date`.

### Core types
- **Utc** — immutable, holds `epochMilliseconds`.
- **Zoned** — `epochMilliseconds` + a `TimeZone`.
- **TimeZone**: **Offset** (fixed UTC offset) or **Named** (IANA region id, e.g. `"Europe/London"`, with automatic DST).

### Construction
```ts
DateTime.unsafeFromDate(jsDate)   // Utc from JS Date; throws on invalid input
DateTime.unsafeMake(input)        // Utc from Date | parts object | string | number; throws
DateTime.make(input)              // safe version → Option<Utc>

DateTime.unsafeMakeZoned(input, { timeZone }) // Zoned; throws on error
DateTime.makeZoned(input, { timeZone })       // safe → Option<Zoned>
DateTime.makeZonedFromString(isoString)       // parses ISO string with tz info

DateTime.now         // Effect<Utc> via the Clock service
DateTime.unsafeNow()  // immediate, via Date.now()
```

### Operations
- Guards: `isDateTime`, `isUtc`, `isZoned`, `isTimeZone`.
- Timezone: `setZone`, `setZoneNamed`, `setZoneOffset`, `zoneFromString`, `zoneMakeNamed`, `zoneMakeOffset`.
- Comparison: `distance` (signed `Duration` between two DateTimes), `min`, `max`, `isGreaterThan`, `between`, `isFuture`, `isPast`.
- Parts: `toParts`, `toPartsUtc`, `getPart`, `setParts`.
- Math: `add`, `subtract` (numeric parts), `addDuration`, `subtractDuration`, `startOf`, `endOf`, `nearest` (rounding).
- Formatting: `format`, `formatLocal`, `formatUtc`, `formatIso`, `formatIsoZoned`, `formatIsoOffset`.
- Ambient timezone context: `nowInCurrentZone`, `withCurrentZoneNamed`, `withCurrentZoneOffset`, `layerCurrentZone`.

```ts
import { DateTime, Effect } from "effect"

const utc = DateTime.unsafeMake("2024-01-01")
const zoned = DateTime.setZone(utc, DateTime.zoneMakeNamed("America/New_York"))

const program = Effect.gen(function* () {
  const zonedNow = yield* DateTime.nowInCurrentZone
  return zonedNow
}).pipe(DateTime.withCurrentZoneNamed("Europe/London"))
```

### When to reach for it
Use `DateTime` instead of the native `Date` whenever timezone correctness matters (scheduling, "current time in user's zone", DST-aware arithmetic) or when you want immutable, Effect-composable time values instead of a mutable object with implicit local-timezone behavior.

---

## 6. Duration

Represents a non-negative span of time; the standard vocabulary for timeouts, delays, retries and scheduling APIs across Effect.

### Construction
```ts
Duration.millis(100)
Duration.seconds(2)
Duration.minutes(5)
Duration.hours(7)
Duration.days(1)
Duration.weeks(3)
Duration.nanos(10n)
Duration.micros(20n)
Duration.infinity           // unbounded duration

Duration.fromInputUnsafe(100)      // number → millis
Duration.fromInputUnsafe(10n)      // bigint → nanos
Duration.fromInputUnsafe("5 seconds") // string "${number} ${unit}"
```

### Operations
- Retrieval: `Duration.toMillis()` (number), `Duration.toNanos()` (`Option<bigint>`), `Duration.toNanosUnsafe()` (bigint, throws if infinite).
- Comparison: `isLessThan`, `isLessThanOrEqualTo`, `isGreaterThan`, `isGreaterThanOrEqualTo`.
- Arithmetic: `Duration.sum(d1, d2)`, `Duration.times(d, factor)`.
- Formatting: `Duration.format()` → human-readable string, e.g. `"1s"`, `"1s 1ms"`.

### When to reach for it
Use `Duration` instead of a raw millisecond `number` anywhere an Effect API expects a time span (`Effect.sleep`, `Effect.timeout`, `Schedule`) — it's self-documenting about units and supports safe arithmetic/comparison, unlike an untyped number.

---

## 7. Result

`Result<A, E>` is a plain discriminated union — `Success<A>` or `Failure<E>` — the v4 replacement/rework of the old `Either`. Docs explicitly note it is **not** recommended as the primary carrier of detailed failure information for effect execution — `Exit` (Cause-based) is preferred for that; `Result` is for lightweight local success/failure branching.

### Construction
```ts
import { Result } from "effect"
const successValue = Result.succeed(42)
const failureValue = Result.fail("not a number")
```

### Guards & pattern matching
```ts
Result.isSuccess(foo)
Result.isFailure(foo)

const message = Result.match(foo, {
  onFailure: (failure) => `The failure value is: ${failure}`,
  onSuccess: (success) => `The Success value is: ${success}`,
})
```

### Mapping / combining
```ts
Result.map(Result.succeed(1), (n) => n + 1)          // Result.succeed(2)
Result.mapError(Result.fail("error"), (s) => s + "!") // Result.fail("error!")
Result.mapBoth(Result.succeed(1), {
  onFailure: (s) => s + "!",
  onSuccess: (n) => n + 1,
})

const person = Result.flatMap(maybeName, (name) =>
  Result.map(maybeAge, (age) => ({ name: name.toUpperCase(), age })),
)

Result.all([maybeName, maybeAge])                     // tuple
Result.all({ name: maybeName, age: maybeAge })         // struct
```

### Generator syntax
```ts
const program = Result.gen(function* () {
  const name = (yield* maybeName).toUpperCase()
  const age = yield* maybeAge
  return { name, age }
})
```
Short-circuits on the first `Failure`, same shape as `Effect.gen`.

### Effect interop
`Effect.fromResult(result)` lifts a `Result<A, E>` into `Effect<A, E>` (`Failure<E>` → `Effect<never, E>`, `Success<A>` → `Effect<A>`).

### When to reach for it
Use `Result` instead of manual `try/catch` or an ad-hoc `{ ok: boolean, ... }` object for small, local, synchronous-style success/failure branching (e.g. validation, parsing) — especially when you want `.map`/`.flatMap`/`Result.gen` composition. Reach for `Exit`/`Cause` instead when you need to preserve the full richness of *why* an Effect failed (defects, interruption).

---

## 8. Exit

`Exit<A, E>` is the structured outcome of running an `Effect` — the return shape of `Effect.runSyncExit` / `Effect.runPromiseExit` / `Effect.exit`.

### States
- `Exit.Success` — holds a value of type `A`.
- `Exit.Failure` — holds a `Cause<E>` (not just a bare `E`).

### Construction
```ts
import { Exit, Cause } from "effect"
const successExit = Exit.succeed(42)                       // Exit<number, never>
const failureExit = Exit.failCause(Cause.fail("Something went wrong")) // Exit<never, string>
```

### Pattern matching
```ts
Exit.match(simulatedSuccess, {
  onFailure: (cause) => `Exited with failure state: ${Cause.pretty(cause)}`,
  onSuccess: (value) => `Exited with success value: ${value}`,
})
```

### Relationships
- **Exit vs Result**: conceptually `Exit<A, E>` is like `Result<A, Cause<E>>` — same two-branch shape, but the failure branch carries a full `Cause` (expected error, defect, or interruption) instead of a bare `E`.
- **Exit vs Effect**: `Exit` is itself a (constant) `Effect` — `Exit.succeed` behaves like `Effect.succeed`.

### When to reach for it
Use `Exit` (via `Effect.runSyncExit`/`runPromiseExit`/`Effect.exit`) instead of manually tracking "did it succeed or throw" at the edge of your program, or whenever you need to inspect *why* an Effect failed (expected failure vs defect vs interruption) rather than just that it failed.

---

## 9. HashSet

An unordered collection of unique values with efficient membership/insert/remove, built on Effect's `Equal`/`Hash` traits so structural (not just reference) equality determines uniqueness. Two variants: immutable `HashSet` and mutable `MutableHashSet`.

### Construction
```ts
import { HashSet, MutableHashSet } from "effect"

const set1 = HashSet.empty()
const set2 = HashSet.make(1, 2, 3)
const set3 = HashSet.fromIterable([1, 2, 3])

const mset1 = MutableHashSet.empty()
const mset2 = MutableHashSet.make(1, 2, 3)
const mset3 = MutableHashSet.fromIterable([1, 2, 3])
```

### Operations
`HashSet` (immutable, all O(1) avg unless noted): `has`, `add` (returns new set), `remove` (returns new set), `size`, `union`, `intersection`, `difference` (O(n)), `map`, `filter`, `reduce`.

```ts
const result = pipe(
  HashSet.make(1, 2, 2, 3, 4, 5, 5),
  HashSet.filter((n) => n % 2 === 0),
  HashSet.map((n) => n * 2),
  Array.from,
) // [4, 8]
```

`MutableHashSet`: `has`, `add`, `remove`, `clear`, `size` — mutate in place.
```ts
const set = MutableHashSet.make(1, 2, 3)
MutableHashSet.add(set, 4)
MutableHashSet.remove(set, 1)
MutableHashSet.clear(set)
```

### Equality
Membership uses `Equal`. Primitives compare by value; plain objects already get structural `Equal` (see Data section), so two different references with the same shape count as one element:
```ts
const person1 = { id: 1, name: "Alice", age: 30 }
const person2 = { id: 1, name: "Alice", age: 30 }
Equal.equals(person1, person2) // true

const set = pipe(HashSet.empty(), HashSet.add(person1), HashSet.add(person2))
HashSet.size(set) // 1 — duplicate ignored
```

### Interop
Both variants implement `Iterable`: spread, `for...of`, `Array.from()` all work.

### When to use vs plain Set
Use `HashSet`/`MutableHashSet` instead of the native `Set` when you need structural equality for complex objects (native `Set` uses reference equality), built-in set algebra (`union`/`intersection`/`difference`), an immutable/fiber-safe collection, or tighter Effect-ecosystem integration. Use plain `Set` for simple primitive membership tracking where reference equality is enough and you want zero extra dependency overhead. Prefer immutable `HashSet` by default; reach for `MutableHashSet` only for performance-critical, tightly-scoped incremental building.

---

## 10. Option

`Option<A>` is `Some<A>` (a value present) or `None` (absent) — the type-safe alternative to `null`/`undefined`. Typical uses: initial/missing values, partial functions, optional struct fields, optional function arguments.

### Construction
```ts
import { Option } from "effect"
const value = Option.some(1)      // Option.some(1)
const noValue = Option.none()     // Option.none()

const isPositive = (n: number) => n > 0
const parsePositive = Option.liftPredicate(isPositive)
parsePositive(5)  // Option.some(5)
parsePositive(-5) // Option.none()
```

### Guards & matching
```ts
Option.isSome(foo)
Option.isNone(foo)

const message = Option.match(foo, {
  onNone: () => "Option is empty",
  onSome: (value) => `Option has a value: ${value}`,
})
```

### Transform / chain / filter
```ts
Option.map(Option.some(1), (n) => n + 1)  // Option.some(2)
Option.map(Option.none(), (n) => n + 1)   // Option.none()

const street = user.address.pipe(Option.flatMap((address) => address.street))

const removeEmptyString = (input: Option.Option<string>) =>
  Option.filter(input, (value) => value !== "")
```

### Extracting values
`Option.getOrThrow`, `Option.getOrNull`, `Option.getOrUndefined`, `Option.getOrElse(() => default)`.
```ts
Option.getOrElse(Option.none(), () => 0) // 0
```

### Fallbacks & combining
```ts
computation().pipe(Option.orElse(() => alternativeComputation()))

Option.firstSomeOf([Option.none(), Option.some(2), Option.none()]) // Option.some(2)

Option.zipWith(maybeName, maybeAge, (name, age) => ({ name: name.toUpperCase(), age }))

Option.all([maybeName, maybeAge])                 // tuple, preserves structure
```

### Generator syntax
```ts
const person = Option.gen(function* () {
  const name = (yield* maybeName).toUpperCase()
  const age = yield* maybeAge
  return { name, age }
})
```

### Interop
```ts
Option.fromNullishOr(null) // Option.none()
Option.fromNullishOr(1)    // Option.some(1)

Effect.fromOption(head([1, 2, 3])) // lift Option into Effect (None → NoSuchElementError)
```
Comparisons/sorting: `Option.makeEquivalence()`, `Option.makeOrder()`.

### When to reach for it
Use `Option` instead of `null`/`undefined` anywhere absence is a normal, expected outcome you want the type system to force callers to handle (map/flatMap/match) rather than silently forgetting a null check. Prefer it over sentinel values (`-1`, `""`) for "no result" cases too.

---

## 11. Redacted

Wraps sensitive values (API keys, passwords, tokens) so they can be carried through the program without accidentally leaking into logs, error messages, or serialized output — they render as `<redacted>` wherever normally stringified.

### Construction
```ts
import { Redacted } from "effect"
const API_KEY = Redacted.make("1234567890")
console.log(API_KEY) // <redacted>
```
Effect's own logging respects this: log output shows `"[...] INFO (#...): <redacted>"` instead of the real value.

### Operations
```ts
Redacted.value(API_KEY) // "1234567890" — use only when the raw value is genuinely needed

Redacted.wipeUnsafe(API_KEY)
Redacted.value(API_KEY) // throws: Error: Unable to get redacted value
```
`Redacted.makeEquivalence(Equivalence.String)` builds an `Equivalence` that compares two redacted values without exposing their contents:
```ts
const equivalence = Redacted.makeEquivalence(Equivalence.String)
equivalence(API_KEY1, API_KEY2) // false — compares safely
```

### When to reach for it
Use `Redacted` instead of a plain `string` for any secret that might flow through `Console.log`, structured logging, tracing spans, or error payloads — it prevents the class of bug where a stray `console.log(config)` or an uncaught error dump leaks a credential. Only unwrap with `Redacted.value` at the exact point of use (e.g. building an auth header), never earlier.

---

## Cheatsheet — data type vs plain JS equivalent

| Data type | Use instead of | Reach for it when |
|---|---|---|
| `Option<A>` | `null` / `undefined` | absence is an expected, type-tracked outcome |
| `Result<A, E>` | `try/catch`, `{ ok, ... }` | local, lightweight success/failure branching & composition |
| `Exit<A, E>` | manual success/failure bookkeeping | you need the full reason an *Effect* stopped (fail/die/interrupt), typically at `run*Exit`/`Effect.exit` boundaries |
| `Cause<E>` | bare `Error` | distinguishing expected failure vs defect vs fiber interruption |
| `Data.TaggedClass` / `Data.TaggedError` | plain object literal / `class X extends Error` | need structural equality and/or `_tag`-based matching (`catchTag`, `$match`) |
| `Chunk<A>` | `Array` | repeated concatenation, or immutability under concurrency |
| `HashSet` / `MutableHashSet` | `Set` | structural equality on complex members, set algebra, Effect ecosystem fit |
| `BigDecimal` | `number` | exact decimal arithmetic (money, financial totals) |
| `DateTime` (Utc/Zoned) | `Date` | timezone-aware, immutable, DST-correct date-time handling |
| `Duration` | raw millisecond `number` | any Effect API expecting a time span (`sleep`, `timeout`, `Schedule`) |
| `Redacted` | plain `string` for secrets | value must never leak into logs/traces/errors |

## Conventions to follow when writing Effect code
- Reach for `Option` over `null`/`undefined`; use `Option.match`/`map`/`flatMap` rather than manual null checks.
- Reach for `Result` for local success/failure composition; reach for `Exit`/`Cause` when you need the full failure story of a *running Effect* (expected error vs defect vs interruption).
- Model domain errors with `Data.TaggedError` (or `Data.Error`) so they compose with `Effect.catchTag` and get structural equality for free.
- Use `Data.TaggedEnum` for discriminated-union domain state instead of hand-rolled tag unions plus manual switch statements — use the generated `$is`/`$match` helpers.
- Prefer `Chunk` over `Array` only when doing repeated concatenation or when immutability under concurrency matters; otherwise a plain array is simpler.
- Prefer `HashSet`/`MutableHashSet` over native `Set` whenever members are complex objects that need structural equality, or when set algebra (`union`/`intersection`/`difference`) is needed.
- Use `BigDecimal` for any monetary/financial arithmetic instead of `number`.
- Use `DateTime` instead of `Date` whenever timezone correctness or immutability matters; use `Duration` instead of raw millisecond numbers for any time span passed to an Effect API.
- Wrap secrets in `Redacted` at the point they enter the program (config/env loading) and only unwrap with `Redacted.value` at the exact point of use.
- All of these types implement `Equal`/`Hash` where relevant — prefer `Equal.equals` over `===`/manual deep-equal when comparing them.
