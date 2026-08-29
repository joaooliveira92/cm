# Effect v4 — Caching & Batching Notes

Source: https://www.effect.website/docs/v4/caching/caching-effects, https://www.effect.website/docs/v4/caching/cache, https://www.effect.website/docs/v4/batching (v4 rc; all three URLs fetched successfully, no redirects needed).

Status: research notes, distilled from the official docs.

---

## 1. Caching Effects

`Effect.cached` and its variants memoize the *result* of a single effectful computation, as opposed to `Cache`, which memoizes results per-key for a family of computations (section 2).

### Effect.cached
Returns a new effect that computes its result lazily on first evaluation and caches it — subsequent evaluations of the returned effect return the cached result without re-running the underlying logic.

```typescript
import { Effect, Console } from "effect"

const program = Effect.gen(function* () {
  const cached = yield* Effect.cached(expensiveTask)
  // first run of `cached` computes and stores the result
  // every subsequent run of `cached` returns the stored result
  yield* cached.pipe(Effect.andThen(Console.log))
})
```

### Effect.cachedWithTTL
Same idea, but the cached value expires after a given duration. After the TTL elapses, the next evaluation recomputes the underlying effect.

```typescript
const cached = yield* Effect.cachedWithTTL(expensiveTask, "150 millis")
```

### Effect.cachedInvalidateWithTTL
Combines TTL expiry with manual invalidation. Returns a tuple `[cachedEffect, invalidate]` — run `invalidate` to force the next evaluation to recompute even before the TTL naturally expires.

```typescript
const [cached, invalidate] = yield* Effect.cachedInvalidateWithTTL(
  expensiveTask,
  "150 millis",
)
```

### Memoizing a keyed function with Cache
For memoizing a *function* (many inputs, one cached result per input) rather than a single nullary effect, reach for the `Cache` data type instead of wrapping each call in `Effect.cached` (see section 2):

```typescript
import { Cache, Effect } from "effect"

let i = 1
const randomNumber = (n: number) => Effect.sync(() => n + i++)

const program = Effect.gen(function* () {
  const cache = yield* Cache.make({
    capacity: Number.MAX_SAFE_INTEGER,
    lookup: randomNumber,
  })
  const memoized = (n: number) => Cache.get(cache, n)
  const c = yield* memoized(10)
  const d = yield* memoized(10)
  return { c, d } // d === c, second call didn't recompute
})
```

---

## 2. The Cache Data Type

`Cache<Key, Value, Error>` is a structured, concurrency-safe key/value cache with bounded capacity, TTL, and a user-supplied lookup function — a different tool from `Effect.cached`, which only memoizes one fixed computation. Use `Cache` whenever the thing being memoized is parameterized by an input (i.e. it's really a function you want memoized, not a single effect).

### Cache.make

```typescript
declare const make: <Key, Value, Error, Requirements>(options: {
  readonly capacity: number
  readonly timeToLive: Duration.Input
  readonly lookup: Lookup<Key, Value, Error, Requirements>
}) => Effect<Cache<Key, Value, Error>, never, Requirements>

type Lookup<Key, Value, Error, Requirements> = (
  key: Key,
) => Effect<Value, Error, Requirements>
```

- **`capacity`** — when the cache is full, least-recently-accessed entries are evicted first. Size may briefly exceed capacity between operations.
- **`timeToLive`** — a `Duration.Input`; values older than the TTL (measured from when they were loaded) are treated as absent and recomputed on next `get`. Use `Duration.infinity` for no expiry.
- **`lookup`** — the function invoked on a cache miss to produce the value as an `Effect`.

### Cache.get and concurrent access
`Cache.get(cache, key)` returns the cached value, or invokes `lookup` on a miss and stores the result. Critically: "if multiple concurrent processes request the same value, it will only be computed once. All other processes will receive the computed value as soon as it is available." Failures from the lookup function are also cached and propagated to all waiters, so a poisoned key doesn't get hammered with repeat computation.

```typescript
import { Effect, Cache, Duration } from "effect"

const expensiveLookup = (key: string) =>
  Effect.sleep("100 millis").pipe(Effect.as(key.length))

const program = Effect.gen(function* () {
  const cache = yield* Cache.make({
    capacity: 100,
    timeToLive: Duration.infinity,
    lookup: expensiveLookup,
  })

  // three concurrent requests for the same key -> lookup runs once
  const result = yield* Effect.all(
    [
      Cache.get(cache, "key1"),
      Cache.get(cache, "key1"),
      Cache.get(cache, "key1"),
    ],
    { concurrency: "unbounded" },
  )

  const size = yield* Cache.size(cache)
  return { result, size }
})
```

### Other Cache operations
| Function | Purpose |
|---|---|
| `Cache.get` | Fetch (or compute-and-store) the value for a key; dedupes concurrent lookups for the same key |
| `Cache.refresh` | Recompute a key's value without evicting the current one (readers keep getting the old value until refresh completes) |
| `Cache.size` | Approximate current entry count |
| `Cache.has` | Check whether a key is present (and not expired) |
| `Cache.invalidate` | Evict a single key |
| `Cache.invalidateAll` | Clear the entire cache |

### Cache vs. Effect.cached
- `Effect.cached`/`cachedWithTTL`/`cachedInvalidateWithTTL` memoize one specific effect value — no keys involved.
- `Cache` memoizes a family of results keyed by input, deduplicates concurrent misses for the *same* key, supports bounded capacity with LRU-style eviction, and exposes explicit invalidation per key or globally.

---

## 3. Batching / RequestResolver

Effect's `Request` + `RequestResolver` machinery is the mechanism for turning many individual effectful requests (e.g. one query per row — the N+1 problem) into a small number of batched, deduplicated calls, transparently, without changing the call-site code.

### Request
A `Request<Value, Error>` is a data description of "I want this value, which may fail with this error." Define one as a tagged interface plus a constructor from `Request.tagged`:

```typescript
interface GetUserById extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

const GetUserById = Request.tagged<GetUserById>("GetUserById")
```

### RequestResolver
A `RequestResolver<A>` knows how to execute one or many requests of type `A`.

**Single-request resolver** (`RequestResolver.fromEffect`) — used when there's nothing to batch, but you still want the Request/Resolver interface:

```typescript
const GetTodosResolver = RequestResolver.fromEffect(
  (_: Request.Entry<GetTodos>): Effect.Effect<Todo[], GetTodosError> =>
    Effect.tryPromise({ /* ... */ }),
)
```

**Batch resolver** (`RequestResolver.make`) — receives *all* the entries batched together in one call and must complete each one:

```typescript
const GetUserByIdResolver = RequestResolver.make(
  (entries: ReadonlyArray<Request.Entry<GetUserById>>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/getUserByIdBatch", {
          method: "POST",
          body: JSON.stringify({
            users: entries.map(({ request }) => ({ id: request.id })),
          }),
        }).then((res) => res.json()) as Promise<Array<User>>,
      catch: () => new GetUserError(),
    }).pipe(
      Effect.andThen((users) =>
        Effect.forEach(entries, (entry, index) =>
          Request.completeEffect(entry, Effect.succeed(users[index]!)),
        ),
      ),
      Effect.catch((error) =>
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.fail(error)),
        ),
      ),
    ),
)
```

### Effect.request
Ties a `Request` value to the `RequestResolver` that knows how to execute it:

```typescript
const getUserById = (id: number) =>
  Effect.request(GetUserById({ id }), GetUserByIdResolver)
```

Calling `getUserById` many times with the same `id` inside a batched context is deduplicated to a single underlying request; different ids issued together are automatically grouped into one call to the resolver.

### Turning on batching
Pass `{ batching: true }` to combinators like `Effect.forEach` (also works with `Effect.all`) so that requests issued across iterations/branches are collected and dispatched together instead of one at a time:

```typescript
const program = Effect.gen(function* () {
  const todos = yield* getTodos
  yield* Effect.forEach(todos, (todo) => notifyOwner(todo), {
    batching: true,
  })
})
```

Example win from the docs: instead of `1 + 2n` queries (1 for the todos list, then 2 per todo — the classic N+1 shape), this executes exactly **3 queries total** regardless of how many todos there are: one for the todo list, one batched request for all the unique users, one batched request for all the emails.

### Resolver-level caching
Resolvers can be wrapped with their own bounded cache, independent of `Cache`/`Effect.cached`:

```typescript
const cachedGetUserByIdResolver = Effect.runSync(
  RequestResolver.withCache(GetUserByIdResolver, { capacity: 256 }),
)

const getUserById = (id: number) =>
  Effect.request(GetUserById({ id }), cachedGetUserByIdResolver)
```

Strategy options: `"lru"` (default) or `"fifo"`. For expiry-based (TTL) caching at the resolver level, use `RequestResolver.asCache` instead of `withCache`.

### Resolvers that need context
A resolver's own execution function must be context-free to remain batchable; if it needs a service, resolve the service first and build the resolver from the result, letting the *outer* effect carry the requirement:

```typescript
class HttpService extends Context.Service<
  HttpService,
  { fetch: typeof fetch }
>()("HttpService") {}

const GetTodosResolver = Effect.map(HttpService, (http) =>
  RequestResolver.fromEffect(
    (_: Request.Entry<GetTodos>): Effect.Effect<Array<Todo>, GetTodosError> =>
      Effect.tryPromise({ /* uses http.fetch */ }),
  ),
)
```

---

## Cheatsheet

| API | Purpose | Notes |
|---|---|---|
| `Effect.cached(effect)` | Memoize a single effect's result forever | Lazy — computes on first run of the returned effect |
| `Effect.cachedWithTTL(effect, duration)` | Memoize with expiry | Recomputes after TTL elapses |
| `Effect.cachedInvalidateWithTTL(effect, duration)` | Memoize with expiry + manual invalidation | Returns `[cached, invalidate]` |
| `Cache.make({ capacity, timeToLive, lookup })` | Create a keyed, bounded, TTL cache | `lookup: Key => Effect<Value, Error, R>` |
| `Cache.get(cache, key)` | Get-or-compute a value by key | Dedupes concurrent misses for the same key; caches failures too |
| `Cache.refresh(cache, key)` | Recompute without evicting current value | Readers see old value until refresh completes |
| `Cache.has` / `Cache.size` | Inspect cache state | |
| `Cache.invalidate(cache, key)` / `Cache.invalidateAll(cache)` | Evict one or all entries | |
| `Request.tagged<T>("Tag")` | Define a Request constructor | Interface extends `Request.Request<Value, Error>` |
| `RequestResolver.fromEffect(fn)` | Single-request resolver | No batching, still gets dedup/cache wrapping |
| `RequestResolver.make(fn)` | Batch resolver | `fn` receives `ReadonlyArray<Request.Entry<A>>`, must `Request.completeEffect` each entry |
| `Effect.request(request, resolver)` | Issue a request through a resolver | |
| `Effect.forEach(items, f, { batching: true })` | Batch requests issued across an iteration | Also works with `Effect.all` |
| `RequestResolver.withCache(resolver, { capacity, strategy? })` | Bounded cache on a resolver | `strategy: "lru" \| "fifo"` (default `"lru"`) |
| `RequestResolver.asCache(resolver, options)` | TTL-based cache on a resolver | Use instead of `withCache` for expiry semantics |

## Conventions to follow when writing Effect code

- Use `Effect.cached` (or `cachedWithTTL`/`cachedInvalidateWithTTL`) to memoize a single fixed effect — e.g. "load config once," "compute this derived value once per process." Don't reach for `Cache` when there's no key involved.
- Use `Cache` (not a hand-rolled `Map` + `Effect.cached` per entry) whenever memoizing a *function* of some key — it gives you bounded capacity with eviction, TTL, and, importantly, automatic deduplication of concurrent misses for the same key, which a naive `Map`-based memo does not.
- Prefer `Request`/`RequestResolver` over ad-hoc per-item `Effect.tryPromise`/`Effect.gen` loops whenever a piece of code fetches something for each item of a collection (the classic N+1 shape: "load list, then load related data per item"). Define a batch `RequestResolver.make` and let `{ batching: true }` on `Effect.forEach`/`Effect.all` do the grouping — don't hand-batch by chunking arrays yourself.
- Keep resolver execution functions context-free; if a resolver needs a service, resolve the service first (`Effect.map(Service, (svc) => RequestResolver.make(...))`) so batching still works across calls that share the same underlying resolver instance. A resolver rebuilt per-call (e.g. one that captures a fresh service each time) won't batch with other calls.
- Reach for `RequestResolver.withCache`/`asCache` when the same request keys recur across the lifetime of a resolver and a resolver-level cache is a more natural fit than wrapping every call site in `Cache.get`.
- Remember `Cache.get` and batched `Effect.request` calls both cache/propagate *failures*, not just successes — don't wrap lookups in `Effect.catch` expecting a fresh retry on the next call; use `Cache.invalidate`/`Cache.refresh` (or a resolver's own cache eviction) if a failed or stale entry needs to be forced to recompute.
- Default new keyed-memoization code to a finite `capacity` rather than `Number.MAX_SAFE_INTEGER`/unbounded, unless the key space is provably small — otherwise a `Cache` can grow unbounded in a long-running process.
