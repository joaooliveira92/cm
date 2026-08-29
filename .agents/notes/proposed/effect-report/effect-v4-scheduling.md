# Effect v4 — Scheduling Notes

Source: https://www.effect.website/docs/v4/scheduling/introduction, https://www.effect.website/docs/v4/scheduling/repetition, https://www.effect.website/docs/v4/scheduling/built-in-schedules, https://www.effect.website/docs/v4/scheduling/schedule-combinators, https://www.effect.website/docs/v4/scheduling/cron, https://www.effect.website/docs/v4/scheduling/examples (v4 rc)

Status: research notes, distilled from the official docs.

Note: `.agents/notes/effect-v4-error-management.md` already covers `Effect.retry` basics under its "Retrying" section (section 6). This note does not duplicate that — see cross-references below where relevant. This note's focus is the `Schedule` data type itself and how it drives repetition/retry.

---

## 1. Introduction

A `Schedule` is an immutable description of a recurrence pattern for executing effects. It is used both for **retrying** (re-running on failure) and **repeating** (re-running on success).

Type signature:

```
      ┌─── The type of output produced by the schedule
      │   ┌─── The type of input consumed by the schedule
      │   │     ┌─── Additional requirements for the schedule
      ▼   ▼     ▼
Schedule<Out, In, Requirements>
```

"A schedule operates by consuming values of type `In` (such as errors in the case of `retry`, or values in the case of `repeat`) and producing values of type `Out`." It decides whether to continue or halt based on the input value and its own internal state.

Conceptually, "Schedules are defined as a collection of intervals spread out over time. Each interval represents a window during which the recurrence of an effect is possible." Each interval's starting boundary determines when the effect runs again — this is the same underlying mechanism for both retry and repeat.

Schedules are composable: combinators like `Schedule.min` / `Schedule.max` let you build "sophisticated schedules by combining and modifying existing ones" (see section 4).

Scheduling doc section pages: Introduction, Repetition, Built-In Schedules, Schedule Combinators, Cron, Examples.

Cross-reference: for `Effect.retry` basics (selective retrying via `while`/`until`/`times`/`schedule`, `Effect.retryOrElse`), see `.agents/notes/effect-v4-error-management.md` section 6. This note covers the same `retry`/`repeat` split but centers on `Schedule` itself.

---

## 2. Repetition

### Effect.repeat
Repeats an effect according to a `Schedule`, or until failure. The initial execution always happens first — scheduled recurrences are *in addition to* that initial run.

```typescript
import { Effect, Schedule, Console } from "effect"

const action = Console.log("success")
const policy = Schedule.addDelay(Schedule.recurs(2), () =>
  Effect.succeed("100 millis"),
)
const program = Effect.repeat(action, policy)
const repetitions = await Effect.runPromise(program)
// logs "success" 3 times total (1 initial + 2 scheduled repeats)
```

On failure, repetition stops immediately and the error propagates — `repeat` does not retry failures itself (use `Effect.retry`, or `Effect.repeatOrElse` for a custom failure handler).

`Effect.repeat` also accepts an options object instead of a bare `Schedule`, e.g. `{ times: 2 }` (repeat 2 additional times after the initial run — a `repeatN`-style shorthand; the docs mention "repeatN" as a concept but express it through `Effect.repeat(action, { times: n })` rather than as a separate top-level function) or `{ until: (n) => n === 3 }` (stop once the predicate on the output is true).

```typescript
const program = Effect.repeat(action, { times: 2 }) // 3 executions total
const program2 = Effect.repeat(action, { until: (n) => n === 3 })
```

### Effect.schedule
Like `repeat`, but skips the initial execution — the action only runs according to the schedule's timing.

```typescript
const program = Effect.schedule(action, policy)
```

### Effect.repeatOrElse
Repeats according to a schedule; on failure, instead of propagating the error immediately, passes the error and the schedule's current output to a fallback handler that produces the final result.

```typescript
const program = Effect.repeatOrElse(action, policy, () =>
  Effect.sync(() => {
    console.log("orElse")
    return count - 1
  }),
)
```

### Retry vs repeat
`Effect.repeat` continues on **success**; `Effect.retry` reacts to **failure**. Per the docs: "You can use `Effect.retry` if you need to set conditions based on error occurrences rather than success outcomes." Both are driven by the same `Schedule` abstraction — a schedule doesn't know whether it's attached to `repeat` or `retry`; it just consumes `In` values (errors for retry, success values for repeat) and decides whether/when to continue.

For `Effect.retry`'s own options (`while`, `until`, `times`, `schedule`) and `Effect.retryOrElse`, see `.agents/notes/effect-v4-error-management.md` section 6 — not repeated here.

---

## 3. Built-In Schedules

The built-in schedules page groups constructors into three categories:

**Infinite and fixed repeats**
- `Schedule.forever` — repeats indefinitely, producing the recurrence count each time; 0ms delays.
- `Schedule.once` — recurs only a single time; one execution with 0ms delay.
- `Schedule.recurs(n)` — repeats a specified number of times, producing the recurrence count. `Schedule.recurs(5)` → 5 executions, 0ms delays between them.

**Recurring at specific intervals**
- `Schedule.spaced(duration)` — repeats indefinitely, delay measured from the *end* of the previous execution. `Schedule.spaced("200 millis")` with a 100ms action yields ~300ms between starts (100ms action + 200ms space) — delays can drift if the action's duration varies.
- `Schedule.fixed(duration)` — recurs at regular wall-clock intervals regardless of action duration; re-runs don't pile up if the action overruns. `Schedule.fixed("200 millis")` with a 100ms action yields a 300ms first interval (from schedule start), then 200ms thereafter — locked to the fixed grid rather than drifting.

**Increasing delays between executions**
- `Schedule.exponential(baseDelay)` — exponential backoff, delay doubles each time. `Schedule.exponential("10 millis")` → 10, 20, 40, 80, 160, 320ms...
- `Schedule.fibonacci(baseDelay)` — delay follows a Fibonacci-style sum-of-previous-two pattern. `Schedule.fibonacci("10 millis")` → 10, 20, 30, 50, 80, 130ms...

The fetched page (checked twice, consistently) does not list additional built-ins (no `stop`, `windowed`, `dayOfWeek`, etc. appear on this v4 doc page as currently published) — the v4 built-in-schedules page is limited to the seven constructors above.

---

## 4. Schedule Combinators

**Composition**
- `Schedule.min([a, b])` — union: recurs if *either* schedule wants to continue, using the shorter of the two delays at each step.
  ```typescript
  const schedule = Schedule.min([
    Schedule.exponential("100 millis"),
    Schedule.spaced("1 second"),
  ])
  ```
- `Schedule.max([a, b])` — intersection: recurs only if *both* schedules want to continue, using the longer delay.
  ```typescript
  const schedule = Schedule.max([
    Schedule.exponential("10 millis"),
    Schedule.recurs(5),
  ])
  // exponential backoff, but capped/stopped once recurs(5) is exhausted
  ```
- `Schedule.concat(a, b)` — sequencing: runs schedule `a` to completion first, then switches to schedule `b`.
  ```typescript
  const schedule = Schedule.concat(
    Schedule.recurs(5),
    Schedule.spaced("1 second"),
  )
  // 5 immediate retries, then settles into 1-second spacing
  ```

**Delay & randomness**
- `Schedule.jittered(schedule)` — adds randomness to the schedule's delay, to avoid multiple callers synchronizing on the same retry timing (thundering herd). "Jitter adds some amount of randomness to the delay of the schedule."
  ```typescript
  const schedule = Schedule.jittered(Schedule.exponential("10 millis"))
  ```
- `Schedule.addDelay(schedule, f)` — adds an (effectful) delay computed from the schedule's current input/output.
- `Schedule.modifyDelay(schedule, f)` — dynamically overrides the delay based on repetition count/output.
  ```typescript
  const schedule = Schedule.modifyDelay(
    Schedule.spaced("1 second"),
    ({ output, duration }) =>
      Effect.succeed(output > 2 ? "100 millis" : duration),
  )
  ```

**Filtering / control**
- `Schedule.while(schedule, predicate)` — filters repetitions based on the schedule's output; stops once the predicate is false.
  ```typescript
  const schedule = Schedule.while(Schedule.recurs(5), ({ output }) => output <= 2)
  // stops once output exceeds 2, even though recurs(5) would allow more
  ```

**Observability**
- `Schedule.tap(schedule, f)` — runs an effectful side operation (e.g. logging) on each input/output pair without altering the schedule's behavior.
  ```typescript
  const schedule = Schedule.tap(Schedule.recurs(2), ({ output }) =>
    Console.log(`Schedule Output: ${output}`),
  )
  ```

The docs also reference `Schedule.identity<E>()` (an identity schedule that passes its input straight through as output — used as a building block, see the "dynamic retry delay" example in section 6) and `Schedule.toStep` (converts a schedule to a step function) in passing, without a dedicated writeup on this page.

Note: the fetched combinators page did not surface separate `union`/`intersect`/`andThen`/`whileOutput`/`whileInput`/`untilOutput`/`untilInput`/`tapInput`/`tapOutput`/`delayed` functions by those exact names — in this v4 doc revision the equivalent behavior is expressed through `min`/`max`/`concat`/`while`/`tap`/`addDelay`/`modifyDelay` as documented above. Treat names not confirmed here as unverified against current v4 docs.

---

## 5. Cron

The `Cron` module builds schedules similar to UNIX cron expressions, with partial constraints (specific months/weekdays), time-zone awareness via `DateTime`, and structured error handling.

### Building a Cron
```typescript
const cron = Cron.make({
  seconds: [0],
  minutes: [0],
  hours: [4],
  days: [8, 9, 10, 11, 12, 13, 14],
  months: [],
  weekdays: [],
  tz: DateTime.zoneMakeNamedUnsafe("Europe/Rome"),
})
```

### Parsing
- `Cron.parse(cronExpression, tz?)` — safe parse, returns a `Result`.
  ```typescript
  const result = Cron.parse("0 0 4 8-14 * *")
  if (Result.isSuccess(result)) {
    console.log("Parsed cron:", result.success)
  }
  ```
- `Cron.parseUnsafe(cronExpression, tz?)` — throws on invalid input.
  ```typescript
  const cron = Cron.parseUnsafe("0 0 4 8-14 * *")
  ```

### Matching and iterating
- `Cron.match(cron, dateInput)` — does a date satisfy the cron?
  ```typescript
  Cron.match(cron, new Date("2025-01-08 04:00:00")) // => true
  ```
- `Cron.next(cron, afterDate?)` — next matching date.
  ```typescript
  const cron = Cron.parseUnsafe("0 0 4 8-14 * *", "UTC")
  const nextDate = Cron.next(cron, new Date("2025-01-08"))
  nextDate.toISOString() // => "2025-01-08T04:00:00.000Z"
  ```
- `Cron.sequence(cron, startDate)` — infinite iterator of matching dates.
  ```typescript
  const iterator = Cron.sequence(cron, new Date("2021-01-08"))
  const first = iterator.next().value
  first?.toISOString() // => "2021-01-08T04:00:00.000Z"
  ```

### Converting to a Schedule
`Schedule.cron(cronInstance)` creates a `Schedule` that fires according to the cron pattern, producing `[start, end]` timestamps (ms) per interval.

```typescript
const cron = Cron.parseUnsafe("0 0 4 8-14 * *", "UTC")
const schedule = Schedule.cron(cron)
```

The doc's syntax examples use the 6-field form `seconds minutes hours days months weekdays` (e.g. `"0 0 4 8-14 * *"`), including range syntax like `8-14`.

---

## 6. Worked Examples

### API calls with timeout + retry
Combine `Effect.retry` and `Effect.timeout` for resilient third-party API calls: retry transient failures a bounded number of times, then cap total wait with a timeout.

```typescript
const program = (url: string) =>
  getJson(url).pipe(
    Effect.retry({ times: 2 }),
    Effect.timeout("4 seconds"),
    Effect.catch(Console.error),
  )
```

### Selective retries based on error codes
Retry only on specific errors (e.g. `401 Unauthorized`) and let others (e.g. `404 Not Found`) pass through immediately, via `retry`'s `while` predicate.

```typescript
const program = (url: string) =>
  getJson(url).pipe(
    Effect.retry({ while: (err) => err.status === 401 }),
    Effect.catch(Console.error),
  )
```

### Dynamic retry delay from a response header (429 + Retry-After)
Build a custom schedule with `Schedule.identity` + `Schedule.addDelay` to honor a server-provided `Retry-After` value, capped by `Schedule.max` with a hard `recurs(5)` limit so it can't retry forever.

```typescript
const policy = Schedule.max([
  Schedule.identity<TooManyRequestsError>().pipe(
    Schedule.addDelay(({ output: error }) =>
      Effect.succeed(
        error._tag === "TooManyRequestsError"
          ? Duration.millis(error.retryAfter)
          : Duration.zero,
      ),
    ),
  ),
  Schedule.recurs(5),
])
```

This demonstrates schedules aren't just fixed timing curves — the delay itself can be computed from the *input* (the error) at each step, and combinators (`max`) can bound a data-driven schedule with a fixed cap.

### Periodic tasks running concurrently with a longer task
Run a repeating action (e.g. a progress log/poll) alongside a longer-running effect, and stop the periodic action once the main task finishes, via `Effect.race`.

```typescript
const program = Effect.race(
  Effect.repeat(action, schedule),
  longRunningEffect,
)
```

---

## Cheatsheet

| API | Category | What it does |
|---|---|---|
| `Effect.repeat(effect, schedule \| options)` | repetition | Re-run on success per schedule; initial run always happens first. |
| `Effect.schedule(effect, schedule)` | repetition | Like `repeat` but skips the initial execution. |
| `Effect.repeatOrElse(effect, schedule, orElse)` | repetition | `repeat`, but on failure calls a handler with the error + schedule output instead of propagating. |
| `Effect.repeat(effect, { times: n })` | repetition | Repeat `n` additional times after the initial run ("repeatN" shorthand). |
| `Effect.retry(effect, schedule \| options)` | retry | Re-run on failure per schedule; see error-management notes for full option set (`while`/`until`/`times`/`schedule`). |
| `Effect.retryOrElse` | retry | `retry`, with a fallback when the schedule is exhausted; see error-management notes. |
| `Schedule.forever` | built-in | Repeats indefinitely, 0ms delay. |
| `Schedule.once` | built-in | Recurs exactly once. |
| `Schedule.recurs(n)` | built-in | Repeats `n` times, 0ms delay. |
| `Schedule.spaced(d)` | built-in | Fixed delay measured from end of previous run (can drift). |
| `Schedule.fixed(d)` | built-in | Fixed wall-clock cadence; no pile-up on slow actions. |
| `Schedule.exponential(base)` | built-in | Exponential backoff (doubling). |
| `Schedule.fibonacci(base)` | built-in | Backoff following Fibonacci sums. |
| `Schedule.min([a,b])` | combinator | Union — continue if either continues, shorter delay. |
| `Schedule.max([a,b])` | combinator | Intersection — continue only if both continue, longer delay. |
| `Schedule.concat(a,b)` | combinator | Sequence — run `a` fully, then `b`. |
| `Schedule.jittered(s)` | combinator | Add randomness to delay (avoid thundering herd). |
| `Schedule.addDelay(s, f)` | combinator | Compute delay effectfully from input/output. |
| `Schedule.modifyDelay(s, f)` | combinator | Override computed delay dynamically. |
| `Schedule.while(s, pred)` | combinator | Stop once predicate on output is false. |
| `Schedule.tap(s, f)` | combinator | Side-effect (e.g. log) per step, doesn't alter timing. |
| `Schedule.identity<E>()` | building block | Passes input straight through as output. |
| `Cron.make(fields)` / `Cron.parse` / `Cron.parseUnsafe` | cron | Build/parse a cron pattern. |
| `Cron.match(cron, date)` | cron | Does date satisfy pattern. |
| `Cron.next(cron, after?)` / `Cron.sequence(cron, start)` | cron | Next / iterator of matching dates. |
| `Schedule.cron(cron)` | cron | Convert a `Cron` into a `Schedule` emitting `[start, end]` ms intervals. |

## Conventions to follow when writing Effect code

- Reach for `Effect.repeat`/`Effect.schedule` for success-driven recurrence (polling, periodic tasks); reach for `Effect.retry` for failure-driven recurrence (transient error recovery) — don't hand-roll loops for either.
- Prefer composing built-in schedules (`min`/`max`/`concat`/`while`/`jittered`/`addDelay`) over writing a bespoke recurrence function — schedules are the standardized, testable unit for timing policy.
- Add `Schedule.jittered` to backoff schedules used by multiple concurrent callers (e.g. many clients retrying the same API) to avoid synchronized retry storms.
- Use `Schedule.fixed` instead of `Schedule.spaced` when cadence must not drift with the action's own duration (e.g. "every 5 minutes on the clock"); use `spaced` when back-to-back spacing after the action completes is what matters.
- When a server signals retry timing (e.g. `Retry-After`), build the delay from `Schedule.identity` + `Schedule.addDelay` reading the input error, and cap it with `Schedule.max` plus a hard `recurs(n)` so a misbehaving server can't cause unbounded retries.
- Use `Schedule.cron` (built from `Cron.parse`/`Cron.parseUnsafe`) for calendar-based recurrence instead of computing next-run times by hand; supply a timezone via `DateTime` when wall-clock-in-a-zone semantics matter.
- Cross-check any `Schedule` combinator name against the current v4 docs before using it — this note found a smaller built-in/combinator surface than v3 docs might suggest (e.g. no separate `union`/`intersect`/`andThen`/`delayed` names surfaced on the fetched v4 pages).
