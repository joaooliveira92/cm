# Effect v4 — Observability Notes

Source: https://www.effect.website/docs/v4/observability/logging, https://www.effect.website/docs/v4/observability/metrics, https://www.effect.website/docs/v4/observability/tracing, https://www.effect.website/docs/v4/observability/tracking-fibers (v4 rc)

Status: research notes, distilled from the official docs.

---

## 1. Logging

### Core logging functions
Structured logging is built in — no separate logging library needed.


| Method | Log Level | Notes |
|---|---|---|
| Effect.log(...) | INFO | Default logging level. |
| Effect.logDebug(...) | DEBUG | Disabled by default. |
| Effect.logInfo(...) | INFO | Standard informational logging. |
| Effect.logWarning(...) | WARN | Used for warning states. |
| Effect.logError(...) | ERROR | Used for regular errors. |
| Effect.logFatal(...) | FATAL | Used strictly for unrecoverable errors. |

Each log line can take multiple strings/values as the message, and can include a `Cause` for detailed error info.

### Default log output fields
The built-in logger prints one line per log call, including:
| Field | Type / Content | Description |
|---|---|---|
| timestamp | ISO 8601 | The exact date and time the log message was generated. |
| level | Severity Level | The severity of the log (e.g., INFO, ERROR, DEBUG, WARN, FATAL). |
| fiber | Fiber ID | The unique identifier of the Fiber that produced the log. |
| message | String / Content | The main logged content or text message. |
| span | Duration (ms) | Optional. Time elapsed in milliseconds when using log spans. |
| cause | Detailed Error | Optional. Detailed context and error info when a Cause is logged. |

### Controlling the minimum log level
Log level is controlled via the `References.MinimumLogLevel` service reference, provided like any other service.

```ts
// Enable Debug-and-above logs
program.pipe(
  Effect.provideService(References.MinimumLogLevel, "Debug"),
)

// Disable all logging
program.pipe(
  Effect.provideService(References.MinimumLogLevel, "None"),
)
```

This gives per-environment (e.g. dev vs prod) and per-component control by scoping where the service is provided.

### Custom annotations
Attach extra structured key/value context to logs emitted within a scope of the program:

```ts
// single annotation
Effect.annotateLogs("key", "value")

// multiple annotations
Effect.annotateLogs({ key1: "value1", key2: "value2" })

// annotation valid only for a Scope
Effect.annotateLogsScoped({ key: "value" })
```

### Log spans (timing)
Measure and log how long a block of work took:

```ts
Effect.withLogSpan("spanLabel")
```

The measured duration shows up in the `span` field of the log line.

### Custom loggers
Loggers are pluggable. Build one with `Logger.make`:

```ts
const logger = Logger.make(({ logLevel, message }) => {
  // custom handling, e.g. send to a remote sink
})
```

### Built-in logger formats
- `stringLogger` — default human-readable key=value format.
- `logfmtLogger` — compact key=value (logfmt) format.
- `prettyLogger` — colorized, indented, for local dev.
- `structuredLogger` — detailed object-based format.
- `jsonLogger` — JSON-stringified structured output (good for log aggregators).

Install a logger (or several) via a `Logger.layer`:

```ts
Logger.layer([customLogger, Logger.tracerLogger])
```

### Loading the log level from config
```ts
Config.logLevel("LOG_LEVEL").pipe(
  Effect.map((level) => Layer.succeed(References.MinimumLogLevel, level)),
  Layer.unwrap,
)
```

This lets the minimum log level be set via an environment variable / config provider rather than hardcoded.

---

## 2. Metrics

Metrics let you capture and analyze numeric signals about a running program (counts, durations, distributions) for dashboards/alerting, distinct from ad-hoc logs. Effect ships five metric types.

### Counter
A cumulative numeric value that can be incremented (and, unless restricted, decremented) over time — request counts, tasks completed, errors seen.

```ts
Metric.counter("request_count", options)
```

- Value type is `number` by default; pass options to use `bigint`.
- `incremental: true` restricts the counter to only accept positive increments (a monotonic counter).
- `Metric.withConstantInput(value)` wraps a counter so every application of the metric increments by a fixed amount automatically.
- `Effect.trackSuccesses(counter)` applies the metric to an effect's successes without changing the effect's `A`/`E`/`R` types.
- `Metric.value(counter)` reads the metric's current value.

### Gauge
A single numeric value that can be set/adjusted directly — represents an instantaneous snapshot (memory usage, queue size), not a running total. Only the most recent value is retained (no history).

```ts
Metric.gauge("queue_size", options)
```

Updated the same way as counters, e.g. via `Effect.trackSuccesses(gauge)`.

### Histogram
Buckets numeric observations into predefined ranges to analyze the distribution of a value (e.g. request latency), tracking count/sum/min/max per bucket. Modeled after Prometheus histograms.

```ts
Metric.histogram("request_duration", {
  boundaries: Metric.linearBoundaries({ start, width, count }),
})
```

- `Metric.timer(...)` is a histogram specialized for durations.
- `Effect.trackDuration(timer)` records how long an effect took into the timer histogram.

### Summary
Reports specific percentiles (quantiles) over a sliding window of recent observations, useful when you want live percentile stats rather than bucketed histograms.

```ts
Metric.summary("response_time", {
  maxAge,      // how long a sample is retained
  maxSize,     // max number of retained samples
  quantiles,   // e.g. [0.1, 0.5, 0.9] for p10/p50/p90
})
```

### Frequency
Counts occurrences of distinct string values, effectively creating one counter per observed value — useful for things like "count of requests per endpoint" or "count of errors per error type."

```ts
Metric.frequency("event_type", options)
```

Internally tracked as a `Map` from observed string to occurrence count.

### Attributes (tags)
Metrics can carry attached key/value attributes for filtering/breakdown in a metrics backend.

```ts
// attach to one metric
Metric.withAttributes({ key: "value" })(counter)

// apply to all metrics read/written within a scope
Effect.provideService(Metric.CurrentMetricAttributes, { region: "us-east-1" })
```

Attributes must match between where a metric is written and where it's read/aggregated.

---

## 3. Tracing

### Spans and traces
A **span** represents a single unit of work/operation and carries:
- **Name** — describes the operation.
- **Timing data** — start time and duration.
- **Log messages** — structured events recorded during the span.
- **Attributes** — key/value metadata for context.

A **trace** is the record of a request's path through a (possibly multi-service) system, composed of one or more related spans; the first span in a trace is the **root span**.

### Instrumenting an effect with a span
```ts
Effect.withSpan("spanName")
```

```ts
const program = Effect.void.pipe(Effect.delay("100 millis"))
const instrumented = program.pipe(Effect.withSpan("myspan"))
```

Important: wrapping an effect with `Effect.withSpan` **does not change its type** — `Effect<A, E, R>` stays `Effect<A, E, R>`.

### Dependencies to actually print/export spans
Tracing integrates with OpenTelemetry via `@effect/opentelemetry`:
- `@effect/opentelemetry@rc`
- `@opentelemetry/sdk-trace-base`
- `@opentelemetry/sdk-trace-node` (Node.js) or `@opentelemetry/sdk-trace-web` (browser)
- `@opentelemetry/sdk-metrics`

### Minimal setup: console exporting
```ts
import { NodeSdk } from "@effect/opentelemetry"
import { ConsoleSpanExporter, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "example" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}))

Effect.runPromise(instrumented.pipe(Effect.provide(NodeSdkLive)))
```

### Span output fields
| Field | Meaning |
|---|---|
| `traceId` | Unique id for the entire trace |
| `parentId` | Id of the parent span; `undefined` for root spans |
| `name` | Span name |
| `id` | Unique id of this span |
| `timestamp` | Start time, microseconds since Unix epoch |
| `duration` | Time to complete the operation |
| `attributes` | Key/value context |
| `status` | Status code (1 = OK, 2 = ERROR) plus optional message |
| `events` | Timestamped events during the span's lifecycle (e.g. logs, exceptions) |
| `links` | Associations with spans in other traces |

### Annotating the current span
```ts
Effect.annotateCurrentSpan("key", "value")
```

```ts
const program = Effect.void.pipe(
  Effect.delay("100 millis"),
  Effect.tap(() => Effect.annotateCurrentSpan("key", "value")),
  Effect.withSpan("myspan"),
)
```

### Logs become span events
Calls to `Effect.log` inside an instrumented effect are automatically recorded as span events (with `name` = the logged message, plus `attributes` like `fiberId`/`logLevel`, `time`, `droppedAttributesCount`).

```ts
const program = Effect.log("Hello").pipe(
  Effect.delay("100 millis"),
  Effect.withSpan("myspan"),
)
```

### Nesting spans
Spans nest naturally by nesting `Effect.withSpan` calls; a child span's `parentId` matches the parent's `id`.

```ts
const child = Effect.void.pipe(
  Effect.delay("100 millis"),
  Effect.withSpan("child"),
)

const parent = Effect.gen(function* () {
  yield* Effect.sleep("20 millis")
  yield* child
  yield* Effect.sleep("10 millis")
}).pipe(Effect.withSpan("parent"))
```

### Errors in spans
A failed effect's span gets `status` code 2 (ERROR) with the error message, plus an event carrying `exception.type`, `exception.message`, `exception.stacktrace`.

### Exporting elsewhere
- **OTLP/HTTP**: swap `ConsoleSpanExporter` for `OTLPTraceExporter` from `@opentelemetry/exporter-trace-otlp-http`, same `BatchSpanProcessor` wiring.
- **Sentry**: use `SentrySpanProcessor` from `@sentry/opentelemetry` as the `spanProcessor`.

---

## 4. Tracking Fibers

Effect provides two structured-concurrency primitives for tracking groups of fibers: **FiberSet** (unkeyed) and **FiberMap** (keyed). Both automatically drop completed fibers from the collection and interrupt any still-running fibers when the owning `Scope` closes — useful for supervising dynamically-spawned work (e.g. one fiber per request/connection) without leaking fibers.

### FiberSet
`FiberSet<A, E>` collects fibers you want to observe, join, or interrupt together.

Key operations:
- `FiberSet.run` — fork an effect and track the resulting fiber in the set.
- `FiberSet.add` — track a fiber that was already forked elsewhere.
- `FiberSet.size` — inspect the current number of tracked fibers.
- Direct iteration over the set for inspection.
- `FiberSet.join` — fail the parent fiber if any tracked fiber fails.
- `FiberSet.awaitEmpty` — wait until every tracked fiber has completed.

```ts
const program = Effect.gen(function* () {
  const set = yield* FiberSet.make<number>()
  const fibFiber = yield* Effect.forkChild(fib(10, set))
  const monitorFiber = yield* Effect.forkChild(
    monitorFibers(set).pipe(Effect.repeat(Schedule.spaced("20 millis"))),
  )
  const result = yield* Fiber.join(fibFiber)
  yield* Fiber.interrupt(monitorFiber)
  console.log(`fibonacci result: ${result}`)
  result
}).pipe(Effect.scoped)
```

This example forks a Fibonacci computation and a separate monitor fiber that polls `set` on an interval to observe live fiber count, then joins the result and interrupts the monitor.

### FiberMap
`FiberMap<K, A, E>` is the keyed counterpart — e.g. tracking one fiber per connected client, keyed by client id. Setting a new fiber under a key that's already occupied first interrupts the previous fiber under that key, so at most one fiber per key runs at a time.

Full API surface: see the FiberMap module reference (`/docs/v4/api/effect/FiberMap`).

---

## Cheatsheet

| Area | API | Purpose |
|---|---|---|
| Logging | `Effect.log` / `logDebug` / `logInfo` / `logWarning` / `logError` / `logFatal` | Emit a structured log at a given level |
| Logging | `References.MinimumLogLevel` | Service ref controlling which levels are emitted |
| Logging | `Effect.annotateLogs` / `annotateLogsScoped` | Attach key/value context to logs |
| Logging | `Effect.withLogSpan` | Time a block and attach duration to logs |
| Logging | `Logger.make`, `Logger.layer` | Build/install a custom logger |
| Logging | `stringLogger`, `logfmtLogger`, `prettyLogger`, `structuredLogger`, `jsonLogger` | Built-in output formats |
| Metrics | `Metric.counter` | Cumulative count (inc/dec, or `incremental: true` for monotonic) |
| Metrics | `Metric.gauge` | Latest-value snapshot |
| Metrics | `Metric.histogram` (+ `linearBoundaries`) | Bucketed distribution |
| Metrics | `Metric.timer` | Histogram specialized for durations |
| Metrics | `Metric.summary` | Sliding-window percentiles |
| Metrics | `Metric.frequency` | Per-distinct-string occurrence counts |
| Metrics | `Effect.trackSuccesses`, `Effect.trackDuration` | Wire an effect's outcomes into a metric |
| Metrics | `Metric.withAttributes`, `Metric.CurrentMetricAttributes` | Tag metrics for filtering |
| Tracing | `Effect.withSpan` | Instrument an effect as a span (type-preserving) |
| Tracing | `Effect.annotateCurrentSpan` | Add an attribute to the active span |
| Tracing | `NodeSdk.layer` + `BatchSpanProcessor` + exporter | Wire up OpenTelemetry export (console/OTLP/Sentry) |
| Fibers | `FiberSet.make/run/add/size/join/awaitEmpty` | Track an unkeyed group of fibers |
| Fibers | `FiberMap` | Track a keyed group of fibers (one per key, new displaces old) |

## Conventions to follow when writing Effect code
- Use `Effect.log*` (not `console.log`) for anything you want structured, level-filtered, and span-correlated.
- Keep DEBUG-level logs cheap and plentiful; they're off by default and enabled per-environment via `References.MinimumLogLevel`.
- Prefer tagged/attributed metrics (`Metric.withAttributes`) over baking dimensions into the metric name.
- Wrap externally-facing or expensive operations in `Effect.withSpan` so they show up in traces without changing the effect's type signature.
- Use `FiberSet`/`FiberMap` (inside a `Scope`) instead of manually tracking forked fibers in an array/map — they handle cleanup and interruption automatically.
- Run effects at the edge with observability layers (`NodeSdkLive`, `Logger.layer`) provided once at the top, not threaded through business logic.
