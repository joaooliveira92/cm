# Effect v4 — Configuration & Runtime Notes

Source: https://www.effect.website/docs/v4/configuration and https://www.effect.website/docs/v4/runtime (v4 rc)

Status: research notes, distilled from the official docs.

---

## Part 1: Configuration

### 1. Core concepts

Effect distinguishes **config descriptions** from **value sources**:

- `Config<T>` describes *how* to load and decode a value. It is itself an `Effect<T, ConfigError>` and can be `yield*`'d directly inside `Effect.gen`.
- A `ConfigProvider` supplies the raw values that a `Config` decodes. **Environment variables are the default source.**

### 2. Built-in scalar constructors

| Constructor | Produces |
|---|---|
| `Config.string(name?)` | string |
| `Config.nonEmptyString(name?)` | non-empty string (fails on empty) |
| `Config.finite(name?)` | finite number |
| `Config.int(name?)` | integer |
| `Config.port(name?)` | integer in 1–65,535 |
| `Config.boolean(name?)` | boolean (accepts case-sensitive "true"/"yes"/"1" etc.) |
| `Config.literal(value, name?)` / `Config.literals(values, name?)` | enumerated values |
| `Config.duration(name?)` | `Duration` |
| `Config.date(name?)` | `Date` |
| `Config.url(name?)` | `URL` |
| `Config.logLevel(name?)` | `LogLevel` |
| `Config.redacted(name?)` | `Redacted<string>` (secret) |

### 3. Defining and parsing a config

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const AppConfig = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT"),
})

const provider = ConfigProvider.fromEnv({
  env: {
    HOST: "localhost",
    PORT: "8080",
  },
})

const result = Effect.runSync(AppConfig.parse(provider))

result // => { host: "localhost", port: 8080 }
```

Using the default environment provider (no explicit `parse`, just `yield*` inside a program):

```typescript
import { Config, Effect } from "effect"

const AppConfig = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT").pipe(Config.withDefault(8080)),
})

const program = Effect.gen(function* () {
  const { host, port } = yield* AppConfig
  console.log(`Application started: ${host}:${port}`)
})

Effect.runPromise(program)
```

### 4. Config with Schema (validation, structured config)

"Use `Config.schema` when a setting needs a custom type, validation, or a structured representation." The provider supplies encoded input; the resulting `Config` produces the schema's `Type`.

```typescript
import { Config, ConfigProvider, Effect, Schema } from "effect"

const Username = Schema.String.check(
  Schema.isMinLength(4, { message: "Expected at least 4 characters" }),
)

const username = Config.schema(Username, "USERNAME")
const provider = ConfigProvider.fromEnv({ env: { USERNAME: "alice" } })

Effect.runSync(username.parse(provider)) // => "alice"
```

Structured (tree-shaped) config — the same schema can read flat `SERVER_HOST`/`SERVER_PORT` env vars or a nested `{ server: { host, port } }` object, depending on the provider:

```typescript
import { Config, ConfigProvider, Effect, Schema } from "effect"

const ServerConfig = Config.schema(
  Schema.Struct({
    host: Schema.String,
    port: Config.Port,
  }),
  "server",
)

const provider = ConfigProvider.fromUnknown({
  server: {
    host: "localhost",
    port: 8080,
  },
})

Effect.runSync(ServerConfig.parse(provider)) // => { host: "localhost", port: 8080 }
```

### 5. Arrays and records

`Config.Array` / `Config.Record` handle comma-separated or delimited values inside structured configs:

```typescript
import { Config, ConfigProvider, Effect, Schema } from "effect"

const exporters = Config.schema(Config.Array(Schema.String), "EXPORTERS")
const provider = ConfigProvider.fromEnv({
  env: { EXPORTERS: "otlp,prometheus" },
})

Effect.runSync(exporters.parse(provider)) // => ["otlp", "prometheus"]
```

### 6. Combining and nesting

`Config.all` merges configs into tuples or named objects. `Config.nested(config, path)` prepends a path segment to lookups — with `ConfigProvider.fromEnv`, segments join with underscores:

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const DatabaseConfig = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT"),
}).pipe(Config.nested("DATABASE"))

const provider = ConfigProvider.fromEnv({
  env: {
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5432",
  },
})

Effect.runSync(DatabaseConfig.parse(provider)) // => { host: "localhost", port: 5432 }
```

### 7. Defaults and optional values

`Config.withDefault(value)` supplies a fallback only when the input is **absent**; invalid input still fails validation:

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const port = Config.port("PORT").pipe(Config.withDefault(8080))
const provider = ConfigProvider.fromUnknown({})

Effect.runSync(port.parse(provider)) // => 8080
```

`Config.option` produces an `Option` for missing values:

```typescript
import { Config, ConfigProvider, Effect, Option } from "effect"

const apiKey = Config.string("API_KEY").pipe(Config.option)
const provider = ConfigProvider.fromUnknown({})

Effect.runSync(apiKey.parse(provider)) // => Option.none()
```

`Config.orElse(() => fallbackConfig)` recovers from **any** `ConfigError`, including validation failures:

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const host = Config.string("HOST").pipe(
  Config.orElse(() => Config.string("FALLBACK_HOST")),
)

const provider = ConfigProvider.fromUnknown({ FALLBACK_HOST: "localhost" })

Effect.runSync(host.parse(provider)) // => "localhost"
```

### 8. Transforming values

`Config.map` applies non-failing transformations; `Config.mapOrFail` is for transforms that can produce a `ConfigError`. Prefer schema-based validation over imperative transforms when possible.

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const origin = Config.all({
  host: Config.nonEmptyString("HOST"),
  port: Config.port("PORT"),
}).pipe(Config.map(({ host, port }) => `http://${host}:${port}`))

const provider = ConfigProvider.fromUnknown({
  HOST: "localhost",
  PORT: 8080,
})

Effect.runSync(origin.parse(provider)) // => "http://localhost:8080"
```

### 9. Sensitive values (Redacted / secrets)

`Config.redacted` wraps strings in `Redacted<string>`; its string representation hides the value. `Redacted.value` gives explicit access to the wrapped secret:

```typescript
import { Config, ConfigProvider, Effect, Redacted } from "effect"

const apiKey = Config.redacted("API_KEY")
const provider = ConfigProvider.fromEnv({
  env: { API_KEY: "secret-value" },
})

const result = Effect.runSync(apiKey.parse(provider))

String(result) // => "<redacted>"
Redacted.value(result) // => "secret-value"
```

Combine `Config.schema` with `Schema.RedactedFromValue` to decode-then-wrap a non-string secret:

```typescript
import { Config, ConfigProvider, Effect, Redacted, Schema } from "effect"

const secretNumber = Config.schema(
  Schema.RedactedFromValue(Schema.FiniteFromString),
  "SECRET_NUMBER",
)

const provider = ConfigProvider.fromEnv({
  env: { SECRET_NUMBER: "42" },
})

const result = Effect.runSync(secretNumber.parse(provider))

Redacted.value(result) // => 42
```

### 10. ConfigProvider implementations

| Provider | Source |
|---|---|
| `ConfigProvider.fromEnv` | environment variables (merges `process.env` and `import.meta.env`) |
| `ConfigProvider.fromUnknown` | an in-memory JS object or parsed JSON |
| `ConfigProvider.fromDotEnvContents` | a parsed `.env` file string |
| `ConfigProvider.fromDotEnv` | reads a `.env` file via the `FileSystem` service |
| `ConfigProvider.fromDir` | a directory tree (useful for Kubernetes ConfigMaps/Secrets) |
| `ConfigProvider.make` | fully custom backing store |

Both `fromEnv` and `fromUnknown` treat empty strings as missing by default — pass `{ preserveEmptyStrings: true }` to change that.

Loading an in-memory/JSON object (useful for tests):

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const provider = ConfigProvider.fromUnknown(
  JSON.parse(`{"server":{"host":"localhost","port":8080}}`),
)

const server = Config.all({
  host: Config.string("host"),
  port: Config.port("port"),
}).pipe(Config.nested("server"))

Effect.runSync(server.parse(provider)) // => { host: "localhost", port: 8080 }
```

### 11. Provider combinators

- `ConfigProvider.nested` — prefixes all lookups with a path segment.
- `ConfigProvider.constantCase` — converts path segments to CONSTANT_CASE (useful for adapting camelCase config keys to env-var style):

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const provider = ConfigProvider.fromEnv({
  env: { DATABASE_HOST: "localhost" },
}).pipe(ConfigProvider.constantCase)

const databaseHost = Config.string("databaseHost")

Effect.runSync(databaseHost.parse(provider)) // => "localhost"
```

- `ConfigProvider.mapInput` — arbitrary transformation of lookup keys.
- `ConfigProvider.orElse(primary, fallback)` — consults `fallback` only when `primary` lacks a value:

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const environment = ConfigProvider.fromEnv({
  env: { HOST: "production.example.com" },
})

const defaults = ConfigProvider.fromUnknown({
  HOST: "localhost",
  PORT: 8080,
})

const provider = ConfigProvider.orElse(environment, defaults)
const app = Config.all({
  host: Config.string("HOST"),
  port: Config.port("PORT"),
})

Effect.runSync(app.parse(provider)) // => { host: "production.example.com", port: 8080 }
```

### 12. Installing a provider

For a whole program, `ConfigProvider.layer(provider)` replaces the active provider for all yielded configs; `ConfigProvider.layerAdd(provider)` adds it as a fallback (`{ asPrimary: true }` gives it precedence instead). For a single `Config`, `config.parse(provider)` is simpler and avoids the layer machinery — this is the preferred approach for tests.

```typescript
import { Config, ConfigProvider, Effect } from "effect"

const provider = ConfigProvider.fromUnknown({ PORT: 8080 })
const ProviderLayer = ConfigProvider.layer(provider)

const program = Effect.gen(function* () {
  return yield* Config.port("PORT")
})

Effect.runSync(Effect.provide(program, ProviderLayer)) // => 8080
```

---

## Part 2: Runtime

### 1. What is a Runtime System?

"An Effect is merely a data structure that describes the execution of a concurrent program." The `Runtime<R>` system turns that description into an executable process: it creates a root fiber, initializes context and fiber-local state, then executes instructions step by step, ultimately producing an `Exit<A, E>`.

Core responsibilities of the runtime:

| Responsibility | Description |
|---|---|
| Executing the program | Executes every step of the effect in a loop until the program completes. |
| Handling errors | Handles both expected and unexpected errors during execution. |
| Managing concurrency | Spawns new fibers (e.g. on `Effect.forkChild`) to handle concurrent operations. |
| Cooperative yielding | Ensures fibers don't monopolize resources, yielding control when necessary. |
| Ensuring resource cleanup | Guarantees finalizers run to clean up resources when needed. |
| Handling async callbacks | Deals with async operations transparently, so sync and async code look uniform. |

There is a **default runtime** built into Effect that `Effect.runSync` / `Effect.runPromise` / `Effect.runFork` use implicitly when an effect has no unmet requirements (`R = never`).

### 2. Running with an explicit context

When an effect has requirements (`R` is not `never`) but you already have a `Context<R>` satisfying them, use the `Effect.run*With` family (e.g. `Effect.runSyncWith`) instead of wrapping the program in `Effect.provide`:

```typescript
import { Context, Effect } from "effect"

// Define a service and its shape
class MathService extends Context.Service<
  MathService,
  { readonly add: (a: number, b: number) => number }
>()("MathService") {}

// Build a context providing an implementation directly
const context = Context.make(MathService, {
  add: (a, b) => a + b,
})

const program = Effect.gen(function* () {
  const math = yield* MathService
  return math.add(2, 3)
})

Effect.runSyncWith(context)(program) // => 5
```

### 3. Locally scoped runtime configuration

Runtime configuration (loggers, config providers, etc.) is inherited from parent workflows. Use `Effect.provide` to temporarily override configuration for a region of code — it reverts once that region completes.

```typescript
import { Logger, Effect, Fiber, Exit } from "effect"

const addSimpleLogger = Logger.layer([
  // Custom logger implementation
  Logger.make(({ message }) => console.log(message)),
])

const program = Effect.gen(function* () {
  yield* Effect.log("Application started!")
  yield* Effect.log("Application is about to exit!")
})

// Running with the default logger
Effect.runFork(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message="Application started!"
timestamp=... level=INFO fiber=#0 message="Application is about to exit!"
*/

// Overriding the default logger with a custom one
const fiber = Effect.runFork(program.pipe(Effect.provide(addSimpleLogger)))
/*
Output:
[ 'Application started!' ]
[ 'Application is about to exit!' ]
*/
Effect.runSync(Fiber.await(fiber)) // => Exit.succeed(undefined)
```

Overrides can be scoped to a nested block only, then reset automatically:

```typescript
import { Logger, Effect } from "effect"

const addSimpleLogger = Logger.layer([
  Logger.make(({ message }) => console.log(message)),
])

const removeDefaultLogger = Logger.layer([])

const program = Effect.gen(function* () {
  // Logs with default logger
  yield* Effect.log("Application started!")

  yield* Effect.gen(function* () {
    // This log is suppressed
    yield* Effect.log("I'm not going to be logged!")

    // Custom logger applied here
    yield* Effect.log("I will be logged by the simple logger.").pipe(
      Effect.provide(addSimpleLogger),
    )

    // This log is suppressed
    yield* Effect.log(
      "Reset back to the previous configuration, so I won't be logged.",
    )
  }).pipe(
    // Remove the default logger temporarily
    Effect.provide(removeDefaultLogger),
  )

  // Logs with default logger again
  yield* Effect.log("Application is about to exit!")
})

Effect.runSync(program) // => undefined
```

### 4. ManagedRuntime

`ManagedRuntime.make(layer)` converts a configuration `Layer` into a reusable, application-wide custom runtime with its own `runSync`/`runPromise`/`runFork` methods — "particularly helpful when you need to reuse specific configurations or contexts" across many executions instead of re-providing a layer on every call.

```typescript
import { Effect, ManagedRuntime, Logger } from "effect"

// Define a configuration layer that replaces the default logger
const appLayer = Logger.layer([
  Logger.make(({ message }) => console.log(message)),
])

// Create a custom runtime from the configuration layer
const runtime = ManagedRuntime.make(appLayer)

const program = Effect.log("Application started!")

// Execute the program using the custom runtime
runtime.runSync(program) // => undefined

// Clean up resources associated with the custom runtime
Effect.runFork(runtime.disposeEffect)
```

`runtime.dispose()` (Promise-returning) or `Effect.runFork(runtime.disposeEffect)` releases any resources acquired by the layer (e.g. connection pools) — always dispose a `ManagedRuntime` when it's no longer needed.

### 5. Context.Service

`Context.Service` combines a service's key and its shape into a single class, giving both `.use()` (direct call with a handler) and `yield*` (inside `Effect.gen`) access patterns.

```typescript
import { Context, Effect } from "effect"

class Notifications extends Context.Service<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>()("Notifications") {}

Notifications.key // => "Notifications"
```

```typescript
import { Context, Effect, Layer } from "effect"

class Notifications extends Context.Service<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>()("Notifications") {}

// Create an effect that depends on the Notifications service
//
//      ┌─── Effect<void, never, Notifications>
//      ▼
const action = Notifications.use((n) => n.notify("Hello, world!"))

Effect.runSync(
  action.pipe(
    Effect.provide(Layer.succeed(Notifications, { notify: () => Effect.void })),
  ),
) // => undefined
```

### 6. Integrations (using ManagedRuntime in external frameworks)

`ManagedRuntime` is the recommended way to manage Effect service lifecycles inside frameworks where Effect isn't the primary control flow (React, Express handlers, etc.): create the runtime once at startup, run effects against it per-request/per-render, and dispose it on shutdown.

```typescript
import { Context, Effect, ManagedRuntime, Layer, Console } from "effect"

// Define the Notifications service using Context.Service
class Notifications extends Context.Service<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>()("Notifications") {
  // Provide a live implementation of the Notifications service
  static Live = Layer.succeed(this, {
    notify: (message) => Console.log(message),
  })
}

// Example entry point for an external framework
async function main() {
  // Create a custom runtime using the Notifications layer
  const runtime = ManagedRuntime.make(Notifications.Live)

  // Run the effect
  const result = await runtime.runPromise(
    Notifications.use((n) => n.notify("Hello, world!")),
  )

  // Dispose of the runtime, cleaning up resources
  await runtime.dispose()

  return result
}

await main() // => undefined
```

---

## Cheatsheet

| API | Purpose |
|---|---|
| `Config.string` / `Config.nonEmptyString` | string config value |
| `Config.int` / `Config.finite` / `Config.port` | numeric config value (integer / finite / 1–65535) |
| `Config.boolean` | boolean config value |
| `Config.literal(s)` / `Config.literals([...])` | enumerated config value |
| `Config.duration` / `Config.date` / `Config.url` / `Config.logLevel` | typed config values |
| `Config.redacted` | secret string, wrapped in `Redacted<string>` |
| `Config.schema(schema, name?)` | validated / structured config via a `Schema` |
| `Config.Array` / `Config.Record` | array/record config values |
| `Config.all({...})` | combine multiple configs into a struct/tuple |
| `Config.nested(config, path)` | prefix lookups with a path segment |
| `Config.withDefault(value)` | fallback only when input is absent |
| `Config.option` | wrap missing value as `Option.none()` |
| `Config.orElse(() => fallback)` | recover from any `ConfigError` |
| `Config.map` / `Config.mapOrFail` | transform a decoded config value |
| `config.parse(provider)` | run a `Config` against a specific `ConfigProvider` (best for tests) |
| `ConfigProvider.fromEnv({ env })` | env-var backed provider (default source) |
| `ConfigProvider.fromUnknown(obj)` | in-memory object/JSON backed provider (best for tests) |
| `ConfigProvider.fromDotEnv` / `fromDotEnvContents` | `.env` file backed provider |
| `ConfigProvider.fromDir` | directory-tree backed provider |
| `ConfigProvider.nested` / `constantCase` / `mapInput` | adapt lookup keys/paths |
| `ConfigProvider.orElse(primary, fallback)` | provider fallback chain |
| `ConfigProvider.layer(provider)` / `layerAdd(provider)` | install provider program-wide via a `Layer` |
| `Runtime<R>` | executable form of an `Effect<A,E,R>`; produces `Exit<A,E>` |
| `Effect.runSyncWith(context)(program)` | run with an explicit `Context<R>` instead of `Effect.provide` |
| `Effect.provide(effect, layer)` | locally override runtime configuration (loggers, providers, services) |
| `ManagedRuntime.make(layer)` | build a reusable custom runtime from a `Layer` |
| `runtime.runSync` / `runtime.runPromise` / `runtime.runFork` | run effects against a custom `ManagedRuntime` |
| `runtime.dispose()` / `Effect.runFork(runtime.disposeEffect)` | release resources held by a `ManagedRuntime` |
| `Context.Service<Self, Shape>()("Name")` | define a service combining key + shape |
| `Service.use(fn)` | consume a `Context.Service` without `Effect.gen` |

## Conventions to follow when writing Effect code

- Declare config with `Config.*` constructors (`Config.nonEmptyString`, `Config.port`, `Config.redacted`, etc.) and combine with `Config.all` — don't read `process.env` directly in application code.
- Use `Config.schema` (with `effect/Schema`) whenever a setting needs validation or a structured shape, rather than hand-rolled parsing/`Config.mapOrFail`.
- Always wrap optional settings in `Config.withDefault` or `Config.option` — never assume env vars are present.
- Wrap secrets (API keys, tokens, connection strings with credentials) in `Config.redacted` (or `Schema.RedactedFromValue` for non-string secrets) so they never leak via `String(...)`/logging; only unwrap with `Redacted.value` at the point of use.
- In tests, prefer `config.parse(ConfigProvider.fromUnknown({...}))` over installing a provider layer — it's simpler and avoids leaking test config into the default runtime.
- For nested config groups (e.g. a `DATABASE_*` block), use `Config.nested(config, "DATABASE")` rather than repeating a prefix in every key name.
- Use the default runtime (`Effect.runSync`/`runPromise`/`runFork`) for simple, single-shot programs and for effects with no unmet requirements (`R = never`).
- Use `ManagedRuntime.make(layer)` when a set of layers (config, services, connections) needs to be created once and reused across many independent executions — e.g. wiring Effect into a non-Effect host like a React app, an Express server, or a Discord bot. Always call `runtime.dispose()` / `Effect.runFork(runtime.disposeEffect)` on shutdown to release resources.
- Reach for `Effect.runSyncWith(context)(program)` only when you already hold a `Context<R>` and want to avoid the ceremony of `Effect.provide` — otherwise prefer `Effect.provide(program, layer)`.
- Use `Effect.provide` to scope configuration overrides (custom loggers, alternate config providers, mocked services) to a specific region of a program; don't mutate the default runtime globally.
- Model services with `Context.Service<Self, Shape>()("Name")` and attach a `static Live = Layer.succeed(this, {...})` for the production implementation, so tests can swap in a different layer.
