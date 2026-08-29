# Effect v4 — Requirements Management Notes

Source:
- https://www.effect.website/docs/v4/requirements-management/services
- https://www.effect.website/docs/v4/requirements-management/default-services
- https://www.effect.website/docs/v4/requirements-management/layers
- https://www.effect.website/docs/v4/requirements-management/layer-memoization

Status: research notes, distilled from the official docs.

---

## 1. Services

### Core concepts
Three terms underpin requirements management:
- **Service** — a reusable component providing specific functionality (e.g. logging, random numbers, DB access).
- **Service key** — a unique identifier Effect uses to locate/associate the service's implementation. This is what shows up in an effect's `Requirements` (`R`) type parameter.
- **Context** — a collection of services, conceptually a map from service keys to implementations, threaded implicitly through effect execution.

### Defining a service
Services are defined with `Context.Service`, subclassing it with a string tag as the unique identifier:

```ts
import { Effect, Context } from "effect"

class Random extends Context.Service<
  Random,
  { readonly next: Effect.Effect<number> }
>("MyRandomService") {}
```

- First type param (`Random`) is the service's own class — used as the service key in the type system.
- Second type param is the shape of the service implementation (an interface/struct of fields, often effect-returning methods).
- The string argument (`"MyRandomService"`) is the unique tag/identifier used at runtime to distinguish this service from others with the same shape.

### Using a service
Inside `Effect.gen`, `yield*` the service class itself to pull the implementation out of context:

```ts
const program = Effect.gen(function* () {
  const random = yield* Random
  const randomNumber = yield* random.next
  console.log(`random number: ${randomNumber}`)
})
// program: Effect<void, never, Random>
```

The service now appears in the effect's `Requirements` (`R`) type parameter — `Random` — signalling it must be supplied before the effect can run.

### Providing a service
`Effect.provideService` supplies a concrete implementation for a single service, discharging it from `R`:

```ts
const runnable = Effect.provideService(program, Random, {
  next: Effect.sync(() => Math.random()),
})
// runnable: Effect<void, never, never>
```

Multiple services can be assembled into one `Context` and supplied together via `Effect.provide` (see Layers below for the more common way to do this when services have their own dependencies).

### Optional services
`Effect.serviceOption` accesses a service without requiring it — it returns an `Option` representing whether the service was actually provided, instead of failing/requiring it.

### When to reach for Layers instead
The docs call out: when a service's own construction depends on other services, it's best to separate that construction logic into a **Layer** rather than trying to build/provide the implementation object inline.

---

## 2. Default Services

### Overview
Effect ships built-in implementations for five core services, available automatically with **no explicit provisioning**:
- `Clock`
- `ConfigProvider`
- `Console`
- `Random`
- `Tracer`

Because Effect's runtime wires these in automatically, using them does **not** add anything to an effect's `Requirements` — it stays `never` even though the program depends on, e.g., `Clock`.

### Accessing default services
Each is exposed as a Context reference on its module:

```ts
import { Effect, Clock, Console } from "effect"

const program = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  yield* Console.log(`Application started at ${new Date(now)}`)
})

Effect.runFork(program)
```

### Overriding default services
Use `Effect.provideService` (same mechanism as any custom service) to substitute a different implementation for a default service. The override is scoped to just the effect it's applied to.

```ts
import { Effect, Random } from "effect"

const program = Effect.gen(function* () {
  console.log(yield* Random.next)
})

// Without override — non-deterministic, varies each run
Effect.runSync(program)

// With a seed — deterministic output, useful for tests
const override = program.pipe(Random.withSeed("myseed"))
Effect.runSync(override)
// Output: 0.10428056576185751
```

Some default-service modules expose higher-level convenience helpers on top of raw `provideService` for common overrides (e.g. `Random.withSeed`) — these exist specifically to make deterministic testing easy.

---

## 3. Layers

### What a Layer is
A `Layer` is a **blueprint for constructing a service**, including whatever dependencies that construction needs — it moves dependency management from the service-usage site to the service-construction site.

```
Layer<RequirementsOut, Error, RequirementsIn>
```

- **RequirementsOut** — the service(s) this layer knows how to build.
- **Error** — errors that can occur while constructing the service.
- **RequirementsIn** — the services this layer itself needs in order to do the construction.

### Layer.succeed — no dependencies
Use when the service implementation can be built without needing any other service:

```ts
import { Effect, Context, Layer } from "effect"

class Config extends Context.Service<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>()("Config") {}

const ConfigLive = Layer.succeed(Config, {
  getConfig: Effect.succeed({
    logLevel: "INFO",
    connection: "mysql://username:password@hostname:port/database_name",
  }),
})
// ConfigLive: Layer<Config, never, never>
```

### Layer.effect — effectful construction, with dependencies
Use when building the implementation requires running an effect (e.g. it needs another service):

```ts
class Logger extends Context.Service<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>()("Logger") {}

// Layer<Logger, never, Config>
const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config
    return {
      log: (message) =>
        Effect.gen(function* () {
          const { logLevel } = yield* config.getConfig
          console.log(`[${logLevel}] ${message}`)
        }),
    }
  }),
)
```

Note `LoggerLive`'s `RequirementsIn` is `Config` — the layer itself is not yet runnable until `Config` is supplied.

### Combining layers

**`Layer.merge`** — combine two layers side by side: output is the union of both outputs, input is the union of both inputs (dependencies are *not* resolved, just aggregated):

```ts
// Layer<Config | Logger, never, Config>
const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)
```

**`Layer.provide`** — sequential composition: feeds one layer's output in to satisfy another layer's input requirements. The *provided* layer's own output is not retained in the result, only the target layer's output is:

```ts
// Layer<Database, never, never>
const MainLive = DatabaseLive.pipe(
  Layer.provide(AppConfigLive),
  Layer.provide(ConfigLive),
)
```

**`Layer.provideMerge`** — like `Layer.provide`, but also keeps the provided layer's own output in the final result (merge + provide in one step):

```ts
// Layer<Config | Database, never, never>
const MainLive = DatabaseLive.pipe(
  Layer.provide(AppConfigLive),
  Layer.provideMerge(ConfigLive),
)
```

### A fuller dependency graph
Layers compose transitively — a service built via `Layer.effect` can itself pull in multiple other services:

```ts
class Database extends Context.Service<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown> }
>()("Database") {}

// Layer<Database, never, Config | Logger>
const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config
    const logger = yield* Logger
    return {
      query: (sql: string) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing query: ${sql}`)
          const { connection } = yield* config.getConfig
          return { result: `Results from ${connection}` }
        }),
    }
  }),
)
```

### Providing a fully-built layer graph to a program
Once composed down to `RequirementsIn = never`, provide the layer to a program with `Effect.provide`:

```ts
const program = Effect.gen(function* () {
  const database = yield* Database
  const result = yield* database.query("SELECT * FROM users")
  return result
})

// Effect<unknown, never, never> — fully resolved, no remaining requirements
const runnable = Effect.provide(program, MainLive)

await Effect.runPromise(runnable)
```

### Design principle: keep services dependency-free at the interface
Service *method* signatures should not leak their construction-time dependencies — service operations should be typed with `Requirements = never`. Dependencies belong in the **layer** that builds the service, not in the service's own effect-returning methods. This keeps callers of a service from having to know or provide anything beyond the service itself.

---

## 4. Layer Memoization

### Core concept
Layers are memoized by **reference equality**: if the exact same `Layer` value/reference is depended on from multiple places in a dependency graph, Effect builds it only once and shares that single built instance everywhere it's needed.

### Global vs. local provision
- **Global provision (default, e.g. providing at the top of `main`)** — memoization "just works": reusing the same layer reference twice in the graph results in one allocation.
- **Local provision (providing a layer repeatedly/inline in nested scopes)** — memoization does **not** happen by default; each local `Effect.provide`/`Layer.provide` call re-triggers construction.

### The critical gotcha
Memoization is keyed on **reference identity**, not structural equality. If a layer is produced by calling a factory function (e.g. `makeLoggerLayer(...)`), you must call that factory **once** and reuse the resulting layer value everywhere — calling it again produces a distinct reference that will be built (and allocated) again, defeating sharing:

```ts
// Wrong: two calls -> two distinct layer instances -> built twice
Layer.merge(makeLoggerLayer(), someOtherLayerThatAlsoUses(makeLoggerLayer()))

// Right: call once, reuse the reference
const LoggerLive = makeLoggerLayer()
Layer.merge(LoggerLive, someOtherLayerThatAlsoUses(LoggerLive))
```

### Opting out of memoization
`Layer.fresh(layer)` marks a layer as non-shared, forcing a fresh instantiation every time it is used instead of reusing a memoized instance — useful when a service genuinely needs distinct state per use site.

### Manual control
For advanced cases, `Layer.makeMemoMap` creates an explicit memo map, and `Layer.buildWithMemoMap` builds a layer against that map — giving fine-grained, explicit control over what is shared across multiple separate build operations (rather than relying on the implicit reference-equality behavior).

---

## Cheatsheet

| API | Purpose | Shape |
|---|---|---|
| `Context.Service<Self, Shape>()("Tag")` | Define a service (key + shape) | class declaration |
| `Effect.provideService(effect, Tag, impl)` | Supply one service, discharge from `R` | `Effect<A,E,R \| Tag> -> Effect<A,E,R>` |
| `Effect.serviceOption(Tag)` | Access a service optionally | `Effect<Option<Shape>>` |
| `Clock`, `ConfigProvider`, `Console`, `Random`, `Tracer` | Default services, auto-available | no `R` impact unless overridden |
| `Random.withSeed("seed")` | Deterministic override helper | `effect.pipe(...)` |
| `Layer.succeed(Tag, impl)` | Build a service with no deps | `Layer<Tag, never, never>` |
| `Layer.effect(Tag, effect)` | Build a service via an effect (may have deps) | `Layer<Tag, E, R>` |
| `Layer.merge(a, b)` | Combine layers, union outputs & inputs | `Layer<AOut \| BOut, ..., AIn \| BIn>` |
| `Layer.provide(dep)` | Feed a layer's output into another layer's input | drops `dep`'s own output from result |
| `Layer.provideMerge(dep)` | `provide` + keep `dep`'s output too | keeps both outputs |
| `Effect.provide(effect, layer)` | Supply a fully-built layer graph to a program | `Effect<A,E,R> -> Effect<A,E,never>` (when layer's `RequirementsIn` is `never`) |
| `Layer.fresh(layer)` | Opt out of memoization for this layer | forces re-instantiation per use |
| `Layer.makeMemoMap` / `Layer.buildWithMemoMap` | Manual memoization control | explicit shared build context |

## Conventions to follow when writing Effect code
- Define services with `Context.Service<Self, Shape>()("UniqueTag")`; keep the shape's methods typed with `Requirements = never` — push dependencies into the layer, not the service interface.
- Prefer building services via `Layer.succeed`/`Layer.effect` over ad-hoc `Effect.provideService` calls once a service has its own dependencies.
- Compose layer graphs with `Layer.provide`/`Layer.provideMerge`/`Layer.merge`, resolving down to `RequirementsIn = never` before calling `Effect.provide` on a program.
- Don't call a layer-producing factory function more than once if you need it shared — store the result in a const and reuse the reference, since memoization is by reference equality.
- Use `Layer.fresh` deliberately (and rarely) when a service genuinely needs a non-shared instance per use site; otherwise rely on default memoization.
- Rely on Effect's default services (`Clock`, `Random`, `Console`, `ConfigProvider`, `Tracer`) without provisioning them; override via `Effect.provideService` (or module helpers like `Random.withSeed`) only when you need determinism, e.g. in tests.
- Provide layers at the edge of the program (same place effects are run), mirroring the "run effects only at `main`" convention from the getting-started notes.
