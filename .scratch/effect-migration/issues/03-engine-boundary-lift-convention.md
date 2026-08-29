# 03: Engine boundary lift convention

## Question

Write and reify the boundary rule for calling the pure `game-engine`/`shared` modules from Effect
code, per the posture ticket 01. At minimum: lift with `Effect.sync`/`Effect.try` at each
desktop→engine call site, decide how the engine's interior invariant throws (e.g.
`tactical-modifiers.ts:19`, "no phase defined for position") surface from inside the lift (defect vs
remapped tagged error via the `{ try, catch }` overload), and settle whether a `RandomSource` stays a
param or moves to Context. The answer asserts a convention, so it warrants an Agent Note written
atomically with resolution.

Type: task
Blocked by: 01 (posture) and 02 (the throw-site removals already converted)
Status: resolved

## Answer

The boundary rule is written and reified: every desktop→engine call that can reach an engine throw
lifts through `Effect.sync`, so a throw surfaces as a defect, never a tagged failure. The engine's
single interior invariant throw (`tactical-modifiers.ts:19`, reached only through `simulateMatch*`)
now crosses the seam lifted, not remapped. Applied at the only two throw-capable call sites:

| Call site | File |
|---|---|
| `simulateMatchWithCondition` in `resolveFixtureScore` | `season.ts` |
| `simulateMatchWithCounts` via `deriveMatchEvents` in `resumeSimulation` and `submitMatchCommand` | `match.ts` |

Total engine/shared calls (`createSeededRng`, `conditionAfterDays`, `judgeBoardObjective`,
`nextManagerOutcome`, `renderCommentary`) stay plain calls, no lift ceremony. `RandomSource` stays a
parameter, never Context. Green gate: `pnpm typecheck` (strict) passes; the suite passes with one
pre-existing seed-dependent flake (`matchCommands.test.ts`'s 5-sub cap test — matches seed from
`Date.now()` and a red card, which `startMatchWithNoInjuries` doesn't filter, silently rejects a
sub; reproduced on the unmodified baseline at the same rate). See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-28-engine-boundary-lift-convention.md).