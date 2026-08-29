# Effect v4 — Resource Management Notes

Source: https://www.effect.website/docs/v4/resource-management/introduction (v4 rc) and https://www.effect.website/docs/v4/resource-management/scope.

Status: research notes, distilled from the official docs.

---

## 1. Introduction (acquireUseRelease)

Long-running applications must handle resources — database connections, file handles, network sockets — carefully: acquire them, use them, and release them, even when errors or interruption happen mid-use. Effect provides dedicated constructs for this instead of relying on manual `try`/`finally`.

### Finalization primitives

- **`Effect.ensuring(finalizer)`** — guarantees a finalizer effect runs whether the main effect succeeds, fails, or is interrupted. Good for simple cleanup (closing a handle, releasing a lock) but doesn't give the finalizer access to the outcome.
- **`Effect.onExit(f)`** — runs cleanup after the main effect completes, passing an `Exit` describing the outcome (success, failure, or interruption). The cleanup step itself is **uninterruptible**, which matters for complex/high-concurrency cleanup.
- **`Effect.onError(f)`** — attaches cleanup that runs only when the effect fails, passing the failure `Cause`. Also uninterruptible, so it always finishes once started.

### acquireUseRelease

```ts
Effect.acquireUseRelease(acquire, use, release)
```

The core three-phase resource pattern:
1. **acquire** — an effect that obtains the resource.
2. **use** — an effect that uses the resource for its intended purpose.
3. **release** — cleanup logic that always runs once the resource was acquired, regardless of how `use` ends (success, failure, interruption).

This automatically manages the resource's lifetime and is the go-to shape for things like DB connections, file handles, and network requests where you don't need the resource to outlive a single call site (contrast with `acquireRelease` + `Scope`, below, for resources whose lifetime spans multiple operations).

---

## 2. The Scope Data Type

`Scope` is the foundational data type behind Effect's resource safety. A scope represents *how long* a set of resources stays open; closing the scope releases all resources registered against it by running their **finalizers**.

With a `Scope` you can:
- **Add finalizers** — register cleanup logic for a resource.
- **Close the scope** — release all resources and run all finalizers.

### Creating and closing a scope manually

```ts
import { Scope, Effect, Console, Exit } from "effect"

const program = Scope.make().pipe(
  Effect.tap((scope) => Scope.addFinalizer(scope, Console.log("finalizer 1"))),
  Effect.tap((scope) => Scope.addFinalizer(scope, Console.log("finalizer 2"))),
  Effect.andThen((scope) => Scope.close(scope, Exit.succeed("scope closed successfully"))),
)

Effect.runPromise(program)
/*
Output:
finalizer 2 <-- finalizers run in reverse order
finalizer 1
*/
```

**Finalizers run in reverse (LIFO) order** — this matters for correctness, e.g. a file must close before the network connection it depends on disconnects.

### Effect.addFinalizer

The high-level, ergonomic way to attach a finalizer to the *current* effect's scope (no manual `Scope.make`/`Scope.close` needed). The finalizer receives the surrounding computation's `Exit`.

```ts
import { Effect, Console } from "effect"

const program = Effect.gen(function* () {
  yield* Effect.addFinalizer((exit) =>
    Console.log(`Finalizer executed. Exit status: ${exit._tag}`),
  )
  return "some result"
})

const runnable = Effect.scoped(program)

await Effect.runPromiseExit(runnable) // => Exit.succeed("some result")
// logs: Finalizer executed. Exit status: Success
```

Same finalizer fires with `Exit status: Failure` if the body does `yield* Effect.fail(...)`, and also fires (still `Failure`, with an `Interrupt` cause) if the body does `yield* Effect.interrupt` — **finalizers run on interruption too**, which is the core resource-safety guarantee tying scopes to fiber interruption.

`Effect.scoped(effect)` is what actually provides a fresh `Scope` to an effect that requires one and closes it (running finalizers) once the effect completes — by whatever means.

### Merging vs. manually splitting scopes

By default, when several scoped effects run inside the same `Effect.scoped(...)`, their scopes **merge into one** — finalizers all run together, in reverse order, when the outer scope closes:

```ts
const program = Effect.gen(function* () {
  yield* task1 // adds "finalizer after task 1"
  yield* task2 // adds "finalizer after task 2"
})

Effect.runPromise(Effect.scoped(program))
/*
task 1
task 2
finalizer after task 2
finalizer after task 1
*/
```

For fine-grained control over *when* each resource releases, create separate scopes explicitly with `Scope.make()` and extend an effect into a given scope with `Scope.provide(scope)`, then close each scope on your own schedule:

```ts
const program = Effect.gen(function* () {
  const scope1 = yield* Scope.make()
  const scope2 = yield* Scope.make()

  yield* task1.pipe(Scope.provide(scope1))
  yield* task2.pipe(Scope.provide(scope2))

  yield* Scope.close(scope1, Exit.void)
  yield* Console.log("doing something else")
  yield* Scope.close(scope2, Exit.void)
})
/*
task 1
task 2
finalizer after task 1
doing something else
finalizer after task 2
*/
```

`Scope.provide` **extends** an effect's scope requirement into another scope *without* closing that scope when the effect completes — it just registers the effect's finalizers there. This is how scoped values get folded into a larger, outer scope.

Important edge case: **closing a scope does not interrupt pending tasks running against it** — a task already in flight continues to run (and its finalizer still fires) even after the scope it belongs to has been closed:

```ts
const program = Effect.gen(function* () {
  const scope = yield* Scope.make()
  yield* Scope.close(scope, Exit.void)
  console.log("Scope closed")
  yield* task.pipe(Scope.provide(scope)) // still runs to completion
})
/*
Scope closed
Executed <-- after task's own delay
Task Finalizer
*/
```

### Effect.acquireRelease

```ts
Effect.acquireRelease(acquire, release)
```

The scope-based counterpart to `acquireUseRelease`: it produces an `Effect<A, E, Scope>` — a workflow that **requires a `Scope`** in its context — rather than bundling `use` inline. This is the building block for resources whose lifetime should be tied to an ambient scope instead of a single call.

- **acquire** is **uninterruptible** — this prevents a partial acquisition (e.g. a connection opened but not fully registered) from leaking.
- Once acquisition succeeds, **release always runs** when the governing `Scope` closes, regardless of how the computation using the resource ends.
- `release` can inspect the `Exit` of the scope to decide what to do (e.g. only roll back on failure).

```ts
interface MyResource {
  readonly contents: string
  readonly close: () => Promise<void>
}

const acquire = Effect.tryPromise({
  try: () => getMyResource().then((res) => { console.log("Resource acquired"); return res }),
  catch: () => new Error("getMyResourceError"),
})

const release = (res: MyResource) => Effect.promise(() => res.close())

const resource = Effect.acquireRelease(acquire, release)
// resource: Effect<MyResource, Error, Scope>

const program = Effect.scoped(
  Effect.gen(function* () {
    const res = yield* resource
    console.log(`content is ${res.contents}`)
  }),
)

Effect.runPromise(program)
/*
Resource acquired
content is lorem ipsum
Resource released
*/
```

Without wrapping in `Effect.scoped`, the program won't type-check/run standalone — the `Scope` requirement in `R` has to be discharged by *something* providing a scope.

### Pattern: sequencing operations with rollback

`acquireRelease`'s release step can be conditioned on the `Exit` to implement all-or-nothing multi-resource setup (e.g. create an S3 bucket, then an ElasticSearch index, then a DB entry — and roll back everything created so far if a later step fails):

```ts
const createBucket = Effect.gen(function* () {
  const { createBucket, deleteBucket } = yield* S3
  return yield* Effect.acquireRelease(createBucket, (bucket, exit) =>
    Exit.isFailure(exit) ? deleteBucket(bucket) : Effect.void,
  )
})
// createIndex / createEntry follow the same shape

const make = Effect.scoped(
  Effect.gen(function* () {
    const bucket = yield* createBucket
    const index = yield* createIndex
    return yield* createEntry(bucket, index)
  }),
)
```

If `createEntry` (the DB step) fails, the scope closes with a `Failure` exit, so both the ElasticSearch index and S3 bucket finalizers see `Exit.isFailure(exit) === true` and delete what they created — in reverse order (index first, then bucket). If an earlier step (e.g. ElasticSearch) fails, only the resources created *before* it (the S3 bucket) get rolled back — nothing later was ever created. This composes cleanly with `Layer`-based service definitions and works the same in tests with stub layers.

---

## Cheatsheet

| API | Purpose | Notes |
|---|---|---|
| `Effect.ensuring(finalizer)` | Run cleanup regardless of outcome | No access to result/`Exit` |
| `Effect.onExit(f)` | Run cleanup with full `Exit` | Uninterruptible |
| `Effect.onError(f)` | Run cleanup only on failure | Uninterruptible; gets `Cause` |
| `Effect.acquireUseRelease(acquire, use, release)` | One-shot acquire → use → release | Resource doesn't need to outlive the call |
| `Scope.make()` | Create a new scope | `Effect<Scope>` |
| `Scope.addFinalizer(scope, effect)` | Register a finalizer on a scope | LIFO execution order |
| `Effect.addFinalizer(f)` | Register a finalizer on the current effect's scope | `f: (exit: Exit) => Effect<void>` |
| `Scope.close(scope, exit)` | Close a scope, run its finalizers | Doesn't interrupt in-flight tasks registered on it |
| `Scope.provide(scope)` | Extend an effect's scope requirement into `scope` | Doesn't close `scope` on completion |
| `Effect.scoped(effect)` | Provide a fresh `Scope`, close it when `effect` completes | Standard way to discharge `Scope` requirement |
| `Effect.acquireRelease(acquire, release)` | Scope-based resource definition | Result type: `Effect<A, E, Scope>`; acquire is uninterruptible |

---

## Conventions to follow when writing Effect code
- Prefer `Effect.acquireUseRelease` for resources scoped to a single call; use `Effect.acquireRelease` + `Effect.scoped` when the resource needs to be threaded through a larger scope.
- Always pair `Effect.acquireRelease` with `Effect.scoped` (or another `Scope` provider) — it doesn't run standalone.
- Use the `Exit` passed to `release`/`onExit`/`addFinalizer` to distinguish success/failure/interruption when cleanup behavior should differ (e.g. rollback only on failure).
- Rely on scope merging (default) for related resources that should release together; only split into separate `Scope.make()`s when you need independent release timing.
- Remember finalizers run in reverse order of registration — register resources in dependency order so cleanup unwinds correctly.
- Don't assume closing a scope interrupts pending work registered on it — it doesn't; interruption is a separate mechanism.
