# Agent Note: Engine boundary lift convention — sync lift, throw becomes defect

Status: proposed

## Problem

`@cm-clone/game-engine` and `@cm-clone/shared` stay pure (Agent Note "Pure packages stay pure" from posture ticket 01), so the desktop main process crosses a seam every time it calls them. The rule for crossing it — which lift constructor, whether a throw is a typed failure or a defect, and whether the seed-dependent RNG moves to Context — was left open for ticket 03 (the lift convention) and lands here.

## Proposal

At every desktop→engine call site, cross the seam with `Effect.sync`:

```ts
const { events, conditions } = yield* Effect.sync(() => simulateMatchWithCondition({ seed, home, away }));
```

Engine and shared functions are called as plain synchronous values. The seam lift is `Effect.sync`, never `Effect.try` with a `try, catch` remap: a throw inside an `Effect.sync` thunk becomes a **defect** (`Die` in the cause tree), catchable with `Effect.catchDefect`, and that is exactly how the engine's single interior invariant throw — `tactical-modifiers.ts:19` ("no phase defined for position") — surfaces at the boundary. It is never remapped to a tagged failure in the E channel, because it is an unreachable programmer-error invariant, not an expected failure.

Two calls in this repo reach that throw, and both now lift with `Effect.sync`:

- `simulateMatchWithCondition` in `season.ts` (`resolveFixtureScore`).
- `simulateMatchWithCounts` (via the pure helper `deriveMatchEvents`) in `match.ts` (`resumeSimulation`, `submitMatchCommand`).

All other engine/shared exports (`createSeededRng`, `conditionAfterDays`, `judgeBoardObjective`, `nextManagerOutcome`, `renderCommentary`, `FORMATION_SLOTS`, …) are provably total — no throw, no IO — and are called directly at their call sites with no lift ceremony. Wrapping a total function in `Effect.sync` buys nothing and makes the seam noisier than it is.

`RandomSource` stays a **parameter**, threaded through pure functions (e.g. `shuffle(items, random)`), never a Context service. Engine/shared never reference Context under the pure-packages posture, and a seeded RNG is a value, not a service to inject or swap at the edge.

## Alternatives considered

- **`Effect.try` with a `{ try, catch }` remap to a `Data.TaggedError`** — rejected: it remaps the engine's one invariant throw into a catchable typed error, turning an unreachable programmer-error into a channel downstream callers are tempted to catch, for an error no valid tactic reaches. This is the control-flow-coupled variant the posture note's "engine/shared throws are defects" foreclosed.
- **Raising every engine/shared call into `Effect.sync`, total or not** — rejected: a pure total call inside `Effect.gen` is already synchronous; the wrapper adds noise everywhere and hides which calls are actually throw-capable. The convention names the throw-capable boundary (`simulateMatch*`) and leaves total calls plain.
- **`RandomSource` in `Context`** — rejected: engine/shared never reference Context under posture 01; a seeded RNG is a param passed down, and putting it in Context would make the pure packages depend on Effect's Context machinery they deliberately avoid.

## Acceptance criteria

- Every desktop→engine call that can reach an engine throw lifts through `Effect.sync`; no engine/shared throw is remapped to a tagged error in the E channel.
- Total engine/shared calls stay plain calls, not wrappers.
- `RandomSource` stays a function parameter.
- `pnpm -r typecheck` (strict) and the suite pass; a green seam means its `Effect.sync` boundaries are explicit.

## Risks

- If the engine ever gains an expected (recoverable) failure, that specific seam needs `Effect.try` with a tagged remap, not a blanket change. Keeping the rule "defect for invariants, remap for expected failures" avoids over-typing the pure packages later.
- A throw inside an `Effect.sync`-lifted engine call is only catchable as a defect (`Effect.catchDefect`), never as a typed error. A caller that expects to handle it as an expected failure will find the convention silent; the invariant-throw status is the reason, and it is checked against the engine's actual throw sites.