# Effect v4 Renderer Interop: Is There an Effect-Native Data Layer?

Produced by research subagent on 2026-08-29.

Sources:
- npm registry API, `https://registry.npmjs.org/effect` — dist-tags and publish times for the v4 line
- npm registry API, `https://registry.npmjs.org/@effect/atom-react` — dist-tags, peer ranges, tarball
- npm registry API, `https://registry.npmjs.org/@effect-atom/atom` and `.../@effect-atom/atom-react` — the pre-rename standalone packages
- npm registry API, `https://registry.npmjs.org/@effect-rx/rx` and `.../@effect-rx/rx-react` — the original packages
- npm registry API, `https://registry.npmjs.org/@effect/rpc` — for the comparison the ticket draws
- Published tarball `effect@4.0.0-rc.112` — `package.json` `exports`, `dist/unstable/reactivity/*.d.ts`, `dist/unstable/rpc/*`
- Published tarball `@effect/atom-react@4.0.0-rc.112` — `package.json`, `dist/Hooks.d.ts`
- GitHub API, `https://api.github.com/repos/Effect-TS/effect/contents/packages/atom?ref=main`
- `https://raw.githubusercontent.com/Effect-TS/effect/main/packages/atom/react/README.md`
- `https://www.effect.website/docs/v4/api` — v4 API reference, "Reactivity" section
- `https://www.effect.website/blog/effect-v4beta-july-recap` — v4 moved into `Effect-TS/effect`, `unstable/*` module list
- `https://github.com/tim-smart/effect-atom` — the standalone repo, last pushed 2026-08-14
- Local: `packages/contracts/src/rpc.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/renderer/SquadScreen.tsx`, `pnpm-workspace.yaml`, `apps/desktop/package.json`

---

## Headline

**Yes. The Effect-native option exists on v4, it is first-party, and it is published at the exact
version this repo is pinned to.** `@effect/atom-react@4.0.0-rc.112` was published on 2026-08-25 with
`peerDependencies: { effect: "^4.0.0-rc.112", react: ">=19.0.0 <20.0.0", scheduler: ">=0.25.0 <0.28.0" }`.
This repo pins `effect: 4.0.0-rc.112` in the `catalog:` block of `pnpm-workspace.yaml` and
`react: ^19.2.0` in `apps/desktop/package.json`. Both peer ranges are satisfied today, with no
override, no `--force`, no vendoring.

The premise the TanStack Query decision rested on — "the Effect-native alternative is not available
on v4, same as `@effect/rpc`" — is false as of 2026-08-25.

## 1. Package identity: the rename chain

The ticket is right that the package was renamed; it has in fact been renamed **twice**, and the
second rename is the one that matters.

| Identity | Latest published | Published | `effect` peer range | v4-ready |
|---|---|---|---|---|
| `@effect-rx/rx` | 0.48.7 | 2025-08-06 | `^3.17.0` | No — dead line |
| `@effect-rx/rx-react` | 0.42.4 | 2025-08-06 | `^3.17` | No — dead line |
| `@effect-atom/atom` | 0.7.0 | 2026-08-14 | `^3.22.1` | **No** |
| `@effect-atom/atom-react` | 0.7.0 | 2026-08-14 | `^3.22.1` | **No** |
| `effect/unstable/reactivity` (in core) | 4.0.0-rc.112 | 2026-08-25 | — (is `effect`) | **Yes** |
| `@effect/atom-react` | 4.0.0-rc.112 (`rc` tag) | 2026-08-25 | `^4.0.0-rc.112` | **Yes** |

Reading order:

1. `effect-rx` → `effect-atom`. The `@effect-rx/*` packages stopped at 0.48.7 / 0.42.4 in August 2025
   and were renamed to `@effect-atom/*` in Tim Smart's `tim-smart/effect-atom` repo.
2. `effect-atom` → **upstreamed into `Effect-TS/effect`** for v4. The standalone `@effect-atom/atom@0.7.0`
   (2026-08-14) still peers on `effect: ^3.22.1` and carries `@effect/rpc`, `@effect/platform` and
   `@effect/experimental` peers — it is the **v3** line and has **no `rc`, `beta` or `next` dist-tag at
   all** (`dist-tags` is exactly `{ latest: "0.7.0" }`). If you only look at `@effect-atom/*`, you
   correctly conclude "not on v4" and stop. That is the trap in this ticket.
3. The v4 line lives in two places instead:
   - **the core `atom` engine is inside `effect` itself**, exported as `effect/unstable/reactivity`;
   - **the React binding is `@effect/atom-react`**, published from `Effect-TS/effect` at
     `packages/atom/react` (confirmed via the GitHub contents API: `packages/atom` contains
     `react`, `solid`, `vue`), and listed under a **"Reactivity"** heading in the official
     [v4 API reference](https://www.effect.website/docs/v4/api).

`@effect/atom-react` has 110 published versions tracking the `effect` version lockstep from
`4.0.0-beta.0` (2026-02-18) through `4.0.0-rc.112`, with dist-tags `beta: 4.0.0-beta.0`,
`latest: 4.0.0-beta.107`, `rc: 4.0.0-rc.112`. Its README's install line is literally
`npm install effect@rc @effect/atom-react@rc`. Sibling `@effect/atom-vue` and `@effect/atom-solid`
are published on the same cadence. This is not a side project on life support; it is released as
part of the v4 release train.

Note that `latest` on `@effect/atom-react` points at `4.0.0-beta.107`, not the rc — same as `effect`
itself, whose `latest` is still `3.22.1`. Install from the `rc` tag or pin exactly, as the catalog
already does for `effect`.

## 2. What ships inside `effect@4.0.0-rc.112`

Verified by unpacking the published tarball. `exports` includes `./unstable/reactivity` and
`./unstable/rpc`. `dist/unstable/reactivity/` contains:

`Atom`, `AtomRegistry`, `AtomRef`, `AtomRpc`, `AtomHttpApi`, `AsyncResult`, `Hydration`, `Reactivity`.

Two of these matter for this ticket.

**`AsyncResult`** is the renderer's loading/error state as a first-class Effect data type:
`initial`, `success`, `failure`, `isWaiting`, `waitingFrom`, `failureWithPrevious`, `match`,
`matchWithWaiting`, `cause`, `toExit`, plus a `Schema`. This is the `useState<X | null>` +
`useState<string | null>` pair in `SquadScreen.tsx` collapsed into one modelled value that carries
the previous value while refetching (`replacePrevious` / `failureWithPrevious`) — that is
"keepPreviousData" and "isFetching vs isLoading" built into the type, not bolted on.

**`Reactivity`** is the key-based invalidation service, and it is exactly the piece the ticket says
matters most:

```ts
readonly mutation: <A, E, R>(keys, effect: Effect<A, E, R>) => Effect<A, E, R>
readonly query:    <A, E, R>(keys, effect) => Effect<Queue.Dequeue<A, E>, never, R | Scope>
readonly invalidate: (keys) => Effect<void>
readonly withBatch: <A, E, R>(effect) => Effect<A, E, R>
```

`mutation` invalidates the given keys **only if the effect succeeds** (documented gotcha in the
d.ts). Atoms opt into a key set via `Atom.withReactivity(keys)`. That is TanStack Query's
`queryClient.invalidateQueries` model, and it is the direct replacement for the three hand-rolled
`reload()` call sites in the renderer.

Also worth flagging out of band: **`effect/unstable/rpc` is in core too** (`Rpc`, `RpcGroup`,
`RpcClient`, `RpcServer`, `RpcMiddleware`, `RpcSerialization`, `RpcTest`, `RpcWorker`). The block
comment at `packages/contracts/src/rpc.ts:50` — "as of this writing `@effect/rpc@latest` (0.76.2)
peer-depends on `effect@^3.22.1` and has no `rc`/`beta` release compatible with `effect@4.0.0-rc.x`"
— is accurate about the *standalone `@effect/rpc` package* (still 0.76.2, peer `^3.22.1`, published
2026-07-31) but is now **stale about the capability**: v4 did not publish a v4 `@effect/rpc`, it
folded RPC into `effect` itself. Out of scope for this ticket, but it is the same rename-vs-absence
mistake, and it is a separate ticket waiting to be written.

## 3. Capability comparison

Against the five axes the ticket names.

| Capability | TanStack Query | Effect Atom on v4 |
|---|---|---|
| Caching | `queryCache`, keyed by `queryKey` | The registry *is* the cache. Atoms are keyed by identity; `Atom.family` gives per-argument atoms (the `saveId`-parameterised case) with weak-ref memoization |
| Staleness / revalidation | `staleTime`, `gcTime`, `refetchOnWindowFocus` | `Atom.swr` (stale-while-revalidate, skips revalidation while fresh), `Atom.setIdleTTL(duration)` (dispose after inactivity — the `gcTime` analogue), `Atom.refreshOnWindowFocus` / `Atom.makeRefreshOnSignal` / `Atom.windowFocusSignal` |
| Polling | `refetchInterval` | `Atom.withRefresh(duration)` (derived atom that reschedules a refresh), or an atom built from a `Stream` |
| Deduplication | by `queryKey` within `staleTime` | structural: one atom = one computation, shared by every subscriber; `Atom.keepAlive` / `Atom.autoDispose` control lifetime; `Atom.debounce` for input-driven refetch |
| **Invalidation after mutation** | `invalidateQueries(key)` from a `queryClient` you must reach for | `Reactivity.mutation(keys, effect)` — invalidation is a property of the mutation effect, applied only on success. Atoms subscribe via `Atom.withReactivity(keys)`. `withBatch` coalesces |
| Mutations | `useMutation` | `Atom.fn` → `AtomResultFn<Arg, A, E>`, a writable atom whose read side is an `AsyncResult`. Write `Reset` / `Interrupt` symbols to cancel — **cancellation is real**, backed by fibers |
| Optimistic updates | manual `onMutate` / rollback | `Atom.optimistic` / `Atom.optimisticFn` as first-class combinators |
| Retry / backoff | `retry`, `retryDelay` | `Effect.retry` with the full `Schedule` vocabulary, inside the atom |
| SSR / persistence | hydration boundary, persisters | `Hydration`, `Atom.serializable`, `Atom.withServerValue`, `Atom.kvs` (KeyValueStore-backed), `Atom.searchParam`. `HydrationBoundary` + `useAtomInitialValues` in the React package |
| Streaming / pagination | `useInfiniteQuery` | `Atom.pull` over a `Stream` with accumulation — strictly more general, and the same primitive covers a live match-event feed |
| Devtools | mature React Query Devtools | **No equivalent.** This is the one real loss |

React surface, from `@effect/atom-react@4.0.0-rc.112`'s `dist/Hooks.d.ts`: `useAtom`, `useAtomValue`,
`useAtomSet`, `useAtomRefresh`, `useAtomMount`, `useAtomSubscribe`, `useAtomSuspense`,
`useAtomInitialValues`, `useAtomRef` / `useAtomRefProp` / `useAtomRefPropValue`, plus
`RegistryProvider` / `RegistryContext` and `HydrationBoundary`. `useAtomSet` and `useAtom` take a
`Mode` of `"value" | "promise" | "promiseExit"`, so an imperative "do this and await the outcome"
handler — what a keyboard action binding needs — is available without leaving the hook API. The
package has **zero runtime dependencies**; everything else comes from `effect`, which is already
installed.

## 4. Interop cost: what the seam looks like

The union to consume is, from `packages/contracts/src/rpc.ts:288`:

```ts
export type RpcResult<M> =
  | { readonly _tag: "Success"; readonly value: RpcSuccess<M> }
  | { readonly _tag: "Failure"; readonly error: unknown };
```

`apps/desktop/src/preload/index.ts` exposes a single `call(method, payload): Promise<RpcResult<M>>`.

**With TanStack Query**, you need a throw-on-`Failure` adapter, because Query's error channel is
"the queryFn threw". So the union gets converted into an exception, the exception's type is erased
to `unknown` on `error`, and every consumer casts it back. You would be un-typing a modelled failure
in order to satisfy a library, in a repo whose lint pass (`scripts/effect-lint.ts`) exists
specifically to stop errors going invisible.

**With Atom**, the union maps onto the Effect error channel directly, with no throwing:

```ts
const call = <M extends AppRpcMethod>(method: M, payload: RpcPayload<M>) =>
  Effect.flatMap(
    Effect.promise(() => window.cmClone.call(method, payload)),
    (result) =>
      result._tag === "Success"
        ? Effect.succeed(result.value)
        : Effect.fail(result.error),
  );

const squadAtom = Atom.family((saveId: SaveId) =>
  Atom.make(call("getSquad", { saveId })).pipe(
    Atom.withReactivity([["squad", saveId]]),
    Atom.setIdleTTL("2 minutes"),
  ),
);

// in the component
const squad = useAtomValue(squadAtom(saveId)); // AsyncResult<SquadView, unknown>
```

and a mutation that invalidates without any `reload()`:

```ts
const signAtom = Atom.fn((playerId: PlayerId) =>
  Reactivity.mutation(call("signFreeAgent", { saveId, playerId }), [["squad", saveId]]),
);
```

That is the whole seam. One adapter function, ~8 lines, shared by every screen. The `useRpc` hook the
ticket imagines mostly dissolves: `Atom.family` + `useAtomValue` already is it.

Two costs to be honest about:

1. **`RpcResult.error` is `unknown`** on the wire type today, so the Effect error channel is
   `unknown` until the failure schema is decoded on the renderer side. That is a pre-existing
   weakness of the hand-rolled RPC, not something Atom introduces — and it is exactly what adopting
   `effect/unstable/rpc`'s `RpcClient` would fix, at which point `AtomRpc` (`Self.query(tag, payload,
   { reactivityKeys, timeToLive, serializationKey })` and `Self.mutation(tag)`) generates the query
   and mutation atoms from the `RpcGroup` for free. Worth sequencing as a follow-on, not a
   precondition.
2. **rc churn.** `@effect/atom-react` is version-locked to `effect` with a caret on an rc
   (`^4.0.0-rc.112`), so every `effect` bump is a coordinated bump of the atom packages. The repo
   already accepts this for `@effect/platform-node`, `@effect/sql-sqlite-node` and `@effect/vitest`
   in the same catalog; this is one more line in that same block, not a new class of risk. The
   inverse risk is worse: TanStack Query is stable but permanently foreign.

## 5. Recommendation

**Switch. Adopt `effect/unstable/reactivity` + `@effect/atom-react@4.0.0-rc.112`. Do not add TanStack Query.**

The version facts that decide it:

- `@effect/atom-react@4.0.0-rc.112`, published 2026-08-25, peers `effect: ^4.0.0-rc.112` — the exact
  version in the `catalog:` block — and `react: >=19.0.0 <20.0.0`, satisfied by `react ^19.2.0`.
- The atom engine ships **inside `effect` itself** at `effect/unstable/reactivity`; adopting it adds
  **one** dependency with **zero** runtime dependencies of its own.
- It is first-party: published from `Effect-TS/effect` at `packages/atom/react`, on the v4 release
  train (110 versions, beta.0 → rc.112), and documented under "Reactivity" in the official v4 API
  reference.
- `Reactivity.mutation(keys, effect)` covers the capability the ticket flagged as decisive —
  invalidate-after-mutation, success-only — which is the thing the three hand-rolled `reload()` calls
  are standing in for.
- The `@effect-atom/*` packages *are* v3-only (`^3.22.1`, no prerelease tags). Judging v4 readiness
  by that name is the error; the package moved.

This overturns the prior agreement, and it should. The agreement's stated basis was a factual claim
about availability that is no longer true. **Nothing has to be unwound to act on this**: TanStack
Query is not yet a dependency anywhere in the repo (it appears only in `.scratch/keyboard-first-renderer/`
planning docs — tickets 01, 08, 10, 13 and `map.md`). The cost of switching now is editing markdown.
The cost of switching after ticket 08 designs the Query shape and screens are ported is a rewrite.

Concretely, this makes ticket 08 ("query adoption shape") an **Atom** adoption shape, and it should
be re-scoped before it is designed, not after.

The single genuine sacrifice is devtools: React Query Devtools has no Atom equivalent. Against that,
weigh keeping one async model in the renderer instead of two, an error channel that does not route
through `throw`, real fiber-backed cancellation for keyboard-driven actions, and `Atom.pull` over a
`Stream` for the match-day live feed — a case TanStack Query handles badly and this codebase will
hit.
