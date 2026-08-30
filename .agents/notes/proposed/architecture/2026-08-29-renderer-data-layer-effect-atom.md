# Agent Note: Renderer data layer is Effect Atom, not TanStack Query

Status: proposed

> **Partially supersedes [[2026-08-28-renderer-boundary-posture]]**, whose decision clause is "No
> Effect runtime in the renderer." That clause no longer holds; the rest of that note — the IPC
> seam's shape and the preload typed-error fix being a preload-level concern — stands unchanged and
> is not absorbed here. Both notes stay active; the archive-vs-retain judgment is left to a later
> `cm-archive-notes` pass.

## Problem

Every renderer screen hand-rolls the same data-fetching pattern: a `useState` for data, a `useState`
for the error, a `useEffect` that calls `window.cmClone.call`, and a local `reload()` that every
mutation invokes by hand. `SquadScreen.tsx`, `LeagueTableScreen.tsx` and `TransfersScreen.tsx` carry
three near-identical copies of it, and `MatchDayScreen.tsx` layers hand-rolled polling on top with
three tuned constants. Cache invalidation is a function call a developer must remember to write.

A data layer was agreed to fix this, and TanStack Query was the initial choice on the belief that no
Effect-native option existed for the v4 rc line. That belief came from a real precedent: the block
comment at `packages/contracts/src/rpc.ts:50` records that `@effect/rpc` peer-depends on
`effect@^3.22.1` with no v4-compatible release, which is why this repo hand-rolled its own RPC group.
Query was accepted as pragmatic despite putting a second async model in a codebase otherwise wholly
committed to Effect v4.

That belief was wrong, and the cost of acting on it would have been a permanent second async model
in the renderer.

## Proposal

The renderer's data layer will be **Effect Atom**. TanStack Query will not be adopted.

The reactive engine ships inside `effect` itself: `effect/unstable/reactivity` is present in the
installed `effect@4.0.0-rc.112`, exporting `Atom`, `AtomRegistry`, `AtomRef`, `AtomRpc`,
`AtomHttpApi`, `AsyncResult`, `Hydration` and `Reactivity`. Only the React binding is a separate
package, `@effect/atom-react`.

Three facts decide it:

- **Version compatibility is exact.** `@effect/atom-react@4.0.0-rc.112` peer-depends on
  `effect: ^4.0.0-rc.112`, the precise version in the workspace `catalog:`, and on
  `react: >=19.0.0 <20.0.0`, satisfied by the app's `react@^19.2.0`.
- **The invalidation story is at parity.** `Reactivity.mutation(keys, effect)` invalidates on
  success only, with atoms subscribing via `Atom.withReactivity`. This is the direct replacement for
  the hand-called `reload()`, which was Query's principal draw. Staleness, GC, polling, dedup,
  optimistic updates and fiber-backed cancellation are covered by `Atom.swr`, `setIdleTTL`,
  `withRefresh`, `refreshOnWindowFocus`, `family` and `debounce`.
- **Interop is strictly cheaper.** The preload bridge returns a `{ _tag: "Success" | "Failure" }`
  union carrying typed domain errors (`InvalidPillarDistributionError`, `SaveSackedError`,
  `InsufficientTransferBudgetError` and others). That union maps onto Effect's error channel
  directly. TanStack Query would require a throw-on-`Failure` adapter that erases the modelled
  failure to `unknown` and pushes screens back to string-matching on `_tag`, which is what
  `App.tsx` does today.

### Install constraint

`@effect/atom-react` must be pinned through the workspace `catalog:` at the exact rc version, as
every other Effect package here is. The `latest` dist-tag is `4.0.0-beta.107`, whose peer range is
`^4.0.0-beta.107` and does **not** satisfy `4.0.0-rc.112`; only the `rc` dist-tag matches. An
untagged install produces a peer conflict. This is the same class of trap that
`packages/contracts/src/rpc.ts:50` documents.

### Relationship to the renderer boundary posture

[[2026-08-28-renderer-boundary-posture]] ruled out an Effect runtime in the renderer on the grounds
that "renderer screens are simple data consumers (fetch-on-mount, mutate-on-click); they don't
compose Effects or need a runtime." Adopting Atom introduces exactly such a runtime, via
`AtomRegistry`.

That reversal is deliberate, and it rests on the premise having changed rather than on the earlier
reasoning having been wrong. When that note was written, no Effect-native renderer binding existed
for v4, so the choice was between a plain-React renderer and a renderer carrying an Effect runtime
for no compositional benefit. It now sits between two runtimes — Effect's or TanStack Query's — since
a data layer is being adopted either way. Given that, the argument that the renderer "doesn't need a
runtime" no longer selects between the live options, and the argument that it should not hold *two*
async models selects Atom.

What survives from that note and is **not** overturned: the IPC seam keeps its present shape
(`window.cmClone.call(method, payload)`), and the preload bridge's typed-error preservation remains
a preload-level fix rather than a reason to change the renderer.

## Alternatives considered

- **TanStack Query.** The original choice, and viable. Rejected because it permanently installs a
  second async model in a codebase whose Effect conventions are machine-enforced by
  `scripts/effect-lint.ts`, and because its error channel cannot carry the repo's tagged domain
  errors without an adapter that discards their types. Its one genuine advantage over Atom is
  mature devtools, which Atom has no equivalent for.
- **Keeping the hand-rolled pattern and extracting only a shared `useRpc` hook.** Removes the
  duplication without any dependency, and would have delivered perhaps 60% of the benefit. Rejected
  because it leaves cache invalidation as a discipline rather than a mechanism, which is the part
  that actually breaks — every mutation must remember to call `reload()`, and nothing catches a
  missed one.
- **`@effect-atom/atom@0.7.0`.** Reached first when searching, and the wrong trail: it is the v3
  line, peer-depending on `effect@^3.22.1` with no rc, beta or next tag. Recorded here because the
  package was renamed twice (`@effect-rx/rx` → `@effect-atom/atom` → upstreamed into core) and the
  dead intermediate is the most discoverable of the three.

## Acceptance criteria

- No renderer file contains a `useState`/`useEffect` fetch triple or a hand-called `reload()`.
- `@effect/atom-react` is pinned in `pnpm-workspace.yaml`'s `catalog:` at the exact rc version
  matching the `effect` pin, and `pnpm install` reports no peer conflict.
- Screens consume typed domain errors from the Effect error channel rather than string-matching on
  `_tag`.
- A mutation invalidates its dependent queries without any screen-local refetch call.
- `pnpm check:all` passes.

## Risks

- **Betting the data layer on an rc-tagged package.** `effect@4.0.0-rc.112` is already a whole-repo
  commitment, so this widens rather than creates the exposure — but the renderer would now break on
  an rc bump, not just the main process.
- **`effect/unstable/*` is explicitly unstable.** The reactivity module's API may move before v4
  stabilises. Mitigated by the same seam discipline used for the binding library: screens import a
  local module, not the package.
- **No devtools.** Query's devtools are genuinely good and Atom has no equivalent; debugging cache
  and invalidation behaviour will be harder.
- **The MatchDay polling loop is the hard conversion.** Its `REVEAL_INTERVAL_MS`,
  `POLL_INTERVAL_MS` and `REFETCH_THRESHOLD` deliberately decouple reveal pace from fetch pace. A
  naive port to any managed refetch will break it, independently of which library is chosen.
- **The reversal could be re-litigated.** Anyone reading [[2026-08-28-renderer-boundary-posture]]
  alone will conclude the renderer must stay runtime-free. That note is left active and this one
  flags the relationship; if the split proves confusing, consolidate in a `cm-archive-notes` pass.
