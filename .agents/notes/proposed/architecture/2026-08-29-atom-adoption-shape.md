# Agent Note: Atom adoption shape — RPC seam, runtime placement, typed errors, and invalidation

Status: proposed

> **Operationalizes [[2026-08-29-renderer-data-layer-effect-atom]]**. The earlier note decided *what* (Atom instead of Query); this note designs *how*. It refines the seam sketch in that note (decode both branches, separate family identity from invalidation keys) and adds the runtime placement rule, error union design, and invalidation map. Both stay active: the earlier note is the rationale, this one is the blueprint.

## Problem

Ticket 02 established that `@effect/atom-react@4.0.0-rc.112` is v4-compatible and matches the workspace `effect` pin. The earlier note committed to Atom. But the commit left eight design questions unanswered:

1. **Seam shape**: what exactly do screens import, and how do we prevent drift?
2. **Runtime placement**: where does `AtomRegistry` live, and what tree does it cover?
3. **Typed errors**: the wire returns `{_tag: "Success" | "Failure", error: unknown}` — how do screens consume typed domain errors without string-matching?
4. **Reactivity keys vs family identity**: are they the same thing, or separate concerns?
5. **Invalidation map**: which mutations invalidate which queries, as a rule?
6. **Staleness policy**: SWR everywhere, or exceptions?
7. **MatchDay polling**: hand-rolled or Atom-stream?
8. **Lint posture**: new renderer-specific Effect rules, or boundary enforcement?

Each has a wrong answer that would accumulate technical debt or defeat the seam's purpose.

## Proposal

### Seam shape (`renderer/rpc`)

One public import boundary: `renderer/rpc`. Screens import only this module:

```ts
import { squadAtom, useAtomValue, setTrainingFocusMutation } from "./rpc";
```

They must not import `window.cmClone.call`, `@effect/atom-react`, or `effect/unstable/reactivity` directly. The seam starts as `renderer/rpc.ts`; private physical decomposition (`renderer/rpc/call.ts`, `renderer/rpc/queries.ts`, etc.) is permitted behind the same import boundary.

No generic `useRpc` hook. `Atom.family` + `useAtomValue` already provide stable atom declarations with registry-owned caching, dependency tracking, and disposal.

### Runtime placement

One `RegistryProvider` at the active-career boundary:

```tsx
{activeCareer === null ? (
  <PreCareerApplication />
) : (
  <RegistryProvider key={activeCareer.saveId}>
    <CareerApplication saveId={activeCareer.saveId} />
  </RegistryProvider>
)}
```

The `key={saveId}` guarantees a fresh registry on save switch, preventing state leakage between careers. Pre-career screens (save list, creation flow, club selection, career commitment) use plain promises and are not covered by the registry.

This supersedes the "no Effect runtime in the renderer" clause from the earlier boundary posture. The corrected rule: the Effect Atom runtime enters the renderer only at the active-career subtree.

### Typed errors end to end

The seam decodes **both** wire branches using the method's schemas — not just the failure branch:

```ts
type RpcClientError<M extends AppRpcMethod> =
  | { readonly _tag: "RemoteFailure"; readonly method: M; readonly error: RpcFailure<M> }
  | { readonly _tag: "ContractDecodeFailure"; readonly method: M; readonly branch: "success" | "failure"; readonly cause: SchemaIssue }
  | { readonly _tag: "TransportFailure"; readonly method: M; readonly cause: unknown };
```

The adapter flow:

1. Invoke `window.cmClone.call` — rejection → `TransportFailure`
2. `_tag === "Success"` — decode with success schema; decode failure → `ContractDecodeFailure`
3. `_tag === "Failure"` — decode with method error schema; decode failure → `ContractDecodeFailure`; success → `RemoteFailure`

This replaces every `result.error as { _tag?: string }` and every `"Failed to load X"` string with typed pattern matching. IPC data remains schema-decoded at the renderer boundary, not trusted from the preload.

### Reactivity keys vs family identity

These are **separate** concerns and must not be conflated:

- **Family key** (memoization/cache identity): the complete normalized request. `playerAtom({ saveId, playerId })` keys on `{ saveId, playerId }`, not `saveId` alone.
- **Reactivity key** (invalidation domain): broader, describing the semantic domain. `["squad", saveId]` invalidates all player/squad atoms for that save.

Do not assume that because all requests contain `saveId`, no additional family parameters are needed.

### Invalidation map

Every save-scoped query subscribes to `["save", saveId]` plus any narrower domain keys:

| Query | Reactivity keys |
|---|---|
| `getSquad(saveId)` | `["save", saveId]`, `["squad", saveId]` |
| `getTransfersScreen(saveId)` | `["save", saveId]`, `["transfers", saveId]`, `["economy", saveId]` |
| `getTactics(saveId)` | `["save", saveId]`, `["tactics", saveId]` |

| Mutation | Invalidates |
|---|---|
| `advanceCalendar` | `["save", saveId]` |
| `setTrainingFocus` | `["squad", saveId]`, `["training", saveId]` |
| `placeBid` | `["transfers", saveId]`, `["economy", saveId]` (not `["squad", saveId]` — a pending bid does not change squad state) |
| `submitMatchCommand` | `["match", saveId, matchId]` |
| `commitCareer` | nothing (career registry not yet mounted) |

No wildcards. No speculative cascades. Failure = no invalidation (`Reactivity.mutation` success-only guarantee).

### Staleness policy

| Category | SWR | Idle TTL |
|---|---|---|
| Management reads (squad, tactics, table, fixtures, transfers, season summary) | Yes | 5 minutes |
| Active match state | No | 1 minute |
| Mutation confirmations / irreversible state | No | — |

SWR data must never authorize a mutation — server-side validation remains authoritative. Match atom disposal must not abandon the durable match; remounting recovers via `awaiting_match_id`.

No `refreshOnWindowFocus` in a single-window desktop app.

### MatchDay polling hand-rolled

The tuned polling/reveal decoupling (`REVEAL_INTERVAL_MS`, `POLL_INTERVAL_MS`, `REFETCH_THRESHOLD`) stays hand-rolled. Do not convert to `Atom.stream`. The seam is used for typed calls and match-start/command mutations only.

`startMatch` is a Fixture-bound mutation, not a query keyed by `opponentId`. Its input is `{ fixtureId, mode: "play" | "quick_result" }`.

### Skip AtomRpc

The hand-rolled RPC group is not an `RpcGroup`; adapting it for `AtomRpc` adds an unnecessary abstraction layer. Leaving the seam direct leaves room for a later migration to `effect/unstable/rpc` without changing screens.

### Catalog pinning

Pin both at the exact rc:

```yaml
catalog:
  effect: 4.0.0-rc.112
  "@effect/atom-react": 4.0.0-rc.112
```

Verify: both packages exist at this version, peer ranges accept each other, `pnpm install --frozen-lockfile` succeeds, no duplicate Effect install.

### Lint posture

No new renderer-specific Effect semantic rules initially. The existing `scripts/effect-lint.ts` rules apply by import. Add **dependency-boundary enforcement** so career screens cannot import from `@effect/atom-react`, `effect/unstable/reactivity`, or `window.cmClone.call` outside `renderer/rpc`.

A rule like "no `Effect.runPromise` in renderer screens" is deferred until an observed pattern justifies it.

## Alternatives considered

- **Generic `useRpc` hook** wrapping loading/error/data/reload. Rejected because it reproduces the abstraction being adopted — `Atom.family` and `useAtomValue` already supply registry-owned caching, typed errors, and dependency tracking. A custom hook would sit between screens and the seam, not replace it.

- **Decode only the failure branch** (proposed in the initial ticket round). Rejected because the preload boundary exposes untrusted wire data — both branches must be validated. A `ContractDecodeFailure` on a success payload is as dangerous as one on a failure.

- **Wildcard invalidation** (`["*", saveId]`). Rejected because no documented `Reactivity.invalidate` API supports tuple wildcards. The explicit `["save", saveId]` key with shared subscription replaces it.

- **`Atom.stream` for MatchDay polling**. Rejected because it would couple the fetch rate to the reveal rate, forcing reimplementation of the same timers inside an atom. The existing decoupling is deliberate per ADR-0007.

- **`AtomRpc` adapter layer**. Rejected because the hand-rolled RPC group is not an `RpcGroup`; adapting it adds another abstraction that screens must not see and that would need to be replaced during a future `effect/unstable/rpc` migration anyway.

## Acceptance criteria

- Career screens access RPC-backed state only through `renderer/rpc`.
- The seam decodes both success and failure wire payloads.
- Transport failures, contract-decoding failures, and typed remote failures are distinct error variants.
- The Atom registry is scoped to one active save via `key={saveId}` and replaced on save switch.
- Atom families use complete request identity (not just `saveId`).
- Reactivity keys describe invalidation domains and are not conflated with cache identity.
- Every save-scoped query subscribes to `["save", saveId]`.
- `advanceCalendar` invalidates `["save", saveId]` only after success.
- Specific mutations invalidate only state they can authoritatively change.
- Management reads use SWR with visible refresh state.
- Current match state never displays stale progress through SWR.
- Match atom disposal never abandons the durable linked match.
- Match polling and event reveal remain independently paced.
- `startMatch` is a Fixture-bound mutation, not an `opponentId`-keyed query.
- `AtomRpc` is not introduced for the hand-rolled RPC group.
- `effect` and `@effect/atom-react` use the same exact RC version; `pnpm install --frozen-lockfile` passes.
- Existing Effect lint applies to renderer seam files.
- Automated boundary checks reject direct preload and Atom imports from career screens.
- No renderer-specific semantic Effect rule is added without an observed recurring problem.

## Risks

- **The seam is as strong as its enforced boundary.** If a career screen imports `window.cmClone.call` directly (perhaps in a hurry, during a bug fix), the seam is silently bypassed. Dependency-boundary lint rules must ship with the seam, not as a follow-up.
- **`effect/unstable/reactivity` is explicitly unstable.** API may move before v4 stabilises. Mitigated by the seam: only `renderer/rpc` imports from `effect/unstable/reactivity`; a later rename is one file.
- **RC churn.** Every `effect` bump requires a coordinated `@effect/atom-react` bump. The repo already accepts this for other packages; it is one more line in the same catalog block.
- **No devtools.** Atom has no equivalent of React Query Devtools. Debugging cache and invalidation behaviour is harder.
- **MatchDay polling is the hard conversion that isn't converted.** The hand-rolled loop stays; the risk is that it diverges from the seam pattern over time, becoming the "one that got away" that new developers copy instead of using atoms.