# 02-effect-v4-renderer-interop

Type: research
Status: resolved

## Answer

**Yes — `@effect/atom-react@4.0.0-rc.112` matches the catalog pin exactly and the engine ships in core as `effect/unstable/reactivity`; the renderer data layer is Effect Atom, not TanStack Query.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-renderer-data-layer-effect-atom.md) and [research findings](../research/02-effect-v4-renderer-interop.md).

## Question

Does an Effect-native option for renderer data-fetching exist on Effect v4 yet, and if so, does it
displace TanStack Query?

The repo is pinned to `effect@4.0.0-rc.x` across every package and enforces Effect conventions with
`scripts/effect-lint.ts`. Adopting TanStack Query puts a *second* async model in the renderer
alongside Effect. That was accepted as pragmatic on the belief that the Effect-native alternative is
not available on v4 — the same problem `packages/contracts/src/rpc.ts` documents for `@effect/rpc`,
which peer-depends on `effect@^3.22.1` and forced a hand-rolled RPC group.

Establish, from primary sources (npm, the Effect repo, release notes, Effect Discord announcements
if they are the only record):

- **`@effect/rx` (or its current name) and v4**: latest published version, its `effect` peer range,
  and whether any `rc`/`beta`/`next` tag is compatible with `4.0.0-rc.x`. Note the package's actual
  current identity — it has been renamed at least once.
- **Anything in `effect` itself**: whether the v4 rc line ships React bindings, a subscribable/Rx
  primitive, or a documented React integration under `effect/unstable/*` or similar.
- **Capability comparison** if a v4-ready option exists: caching, staleness and revalidation,
  polling, request deduplication, and cache invalidation after a mutation — the last one matters
  most, because every screen currently invalidates by hand-calling a local `reload()`.
- **Interop cost either way**: what a `useRpc` seam looks like adapting the
  `{ _tag: "Success" | "Failure" }` union into each candidate. Query needs a throw-on-Failure
  adapter so its error channel works; an Effect-native option would take the union more directly.

Answer with a recommendation. This ticket is permitted to overturn the prior agreement to adopt
TanStack Query — that is why it is being run before the Query shape is designed.
