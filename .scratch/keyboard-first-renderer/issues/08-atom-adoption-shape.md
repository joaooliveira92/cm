# 08-atom-adoption-shape

Type: grilling
Status: resolved
Blocked by: 02

## Question

What exactly does the Effect Atom data layer look like in the renderer?

Re-scoped from a TanStack Query adoption shape after ticket 02 established that
`@effect/atom-react@4.0.0-rc.112` matches the workspace `catalog:` pin exactly and that the reactive
engine ships in core as `effect/unstable/reactivity`. See
[Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-renderer-data-layer-effect-atom.md)
for the decision and its rationale — this ticket designs it, it does not re-litigate it.

Every screen currently hand-rolls the same pattern: `useState(null)` for data, `useState(null)` for
the error, a `useEffect` that fetches, and a local `reload()` that mutations call by hand.
`SquadScreen.tsx`, `LeagueTableScreen.tsx` and `TransfersScreen.tsx` hold three near-identical
copies; `MatchDayScreen.tsx` adds hand-rolled polling on top.

Decide:

- **The seam**: the shape of the internal module that adapts `window.cmClone.call`'s
  `{ _tag: "Success" | "Failure" }` union into Effect's error channel and exposes atoms to screens.
  Screens import only this, never `@effect/atom-react` directly, so a later move is one file.
- **Runtime placement**: where `AtomRegistry` lives, how it is provided to the React tree, and
  whether any other Effect services reach the renderer or only the RPC seam. This is the clause that
  reverses [[2026-08-28-renderer-boundary-posture]], so draw the new boundary explicitly rather than
  letting it drift.
- **Typed errors end to end**: the RPC surface returns `InvalidPillarDistributionError`,
  `SaveSackedError`, `InsufficientTransferBudgetError` and others. Decide how a screen consumes a
  tagged error to render a message, replacing the `_tag` string-matching in `App.tsx`.
- **Reactivity keys**: their shape, and specifically how `saveId` participates, since every screen is
  parameterised by it and loading a different save must not serve stale data. Consider `Atom.family`.
- **Invalidation map**: which mutations invalidate which queries via `Reactivity.mutation`, replacing
  every hand-called `reload()`. Advancing the calendar invalidates nearly everything, so state the
  rule rather than enumerating pairs.
- **Staleness policy**: which of `Atom.swr`, `setIdleTTL`, `withRefresh` and `refreshOnWindowFocus`
  apply, given a single-window offline desktop app where nothing changes behind the player's back
  except the AI clubs acting during a calendar advance.
- **The MatchDay polling loop**: whether `resumeSimulation`'s chunked poll becomes an Atom-managed
  refresh or stays hand-rolled. Its `REVEAL_INTERVAL_MS`, `POLL_INTERVAL_MS` and `REFETCH_THRESHOLD`
  deliberately decouple reveal pace from fetch pace; a naive conversion will break it. Weigh
  `Atom.stream` and `Reactivity.stream` against leaving it alone.
- **`AtomRpc`**: whether it fits this app's hand-rolled RPC group or whether the plain seam is
  simpler. Note that `effect/unstable/rpc` is now in core, which may make the hand-rolled group in
  `packages/contracts/src/rpc.ts` replaceable — but that is a separate effort and must not expand
  this one.
- **Catalog pinning**: confirm the exact rc version lands in `pnpm-workspace.yaml`'s `catalog:`. The
  `latest` dist-tag is a beta whose peer range does not satisfy the pinned `effect` version.
- **Lint posture**: whether `scripts/effect-lint.ts` needs rules for renderer-side Effect usage, or
  whether the existing rules already apply once Effect is in the renderer. Currently tracked in the
  map's fog.

## Answer

**Seam: one public `renderer/rpc` import boundary; runtime at career boundary only; decode both success and failure; separate family identity from invalidation keys; save-level `["save", saveId]` key for calendar-wide invalidation; SWR for management reads, no SWR for match state; polling hand-rolled; no AtomRpc; pin `@effect/atom-react` at 4.0.0-rc.112; boundary enforcement over new Effect-lint rules.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-atom-adoption-shape.md).
