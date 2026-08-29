# 02: Desktop domain throws → tagged Effect failures

## Question

Convert the bare throws in desktop main-process domain logic to `Effect.fail` with
`Data.TaggedError` so expected failures are typed in the error channel:

- `apps/desktop/src/main/season.ts:69` — round-robin fixture generation requires an even club count
  (caller preconditions, currently a throw).
- `apps/desktop/src/main/season.ts:318` — `simulateMatch` produced no `FullTimeWhistle` event (an
  invariant violation worth surfacing as a typed error).
- `apps/desktop/src/main/aiClubs.ts:49` — squad has fewer players than the formation needs.

Test helpers and the CLI gate stay as they are (out of scope). The slice is green when
`tsc --noEmit` passes, the suite passes, and each former throw site either fails through the typed
channel or is explicitly remapped at its boundary.

Type: task
Blocked by: 01 (posture decides how the throw sites that sit near the engine/renderer latitude
surface)
Status: resolved

## Answer

Converted all three bare throws to `Data.TaggedError` classes failing through the Effect channel.
All errors are local to the desktop domain (not in contracts/RPC schema) — they are invariants
unreachable in valid play; `handleRpc`'s catch-all surfaces them as opaque Failures, and the
preload's generic failure path renders the `_tag` name.

| Former throw site | Error class | File |
|---|---|---|
| round-robin even-club-count precondition | `FixtureGenerationError` | `season.ts` |
| `simulateMatch` missing `FullTimeWhistle` invariant | `FullTimeWhistleMissingError` | `season.ts` |
| best-XI fill squad-too-small precondition | `SquadTooSmallError` | `aiClubs.ts` |

`generateRoundRobinFixtures` (pure, exported, unit-tested) became an `Effect.gen` that fails through
the typed channel; the existing callers (`startSeason`) and tests use `yield*`. `bestXiForFormation`
and `pickBestFormationTactic` became Effect-returning; `assignAiTactics` and `getTacticForClub`
callers updated to `yield*`. The v4 idiomatic pattern `return yield* new TaggedError()` (without
`Effect.fail` wrapping) was confirmed via the `effect(unnecessaryFailYieldableError)` suggestion.

Green gate: `pnpm typecheck` (strict) + `pnpm test` (75 tests across 13 files) all pass.