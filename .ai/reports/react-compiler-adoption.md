# Validation Report: react-compiler-adoption

Written by the orchestrator to `.ai/reports/<effort>.md` after the gate, before the commit. Records
what was **observed**, not what was expected.

## Sprint

- Effort: `.scratch/react-compiler-adoption/`
- Tickets closed: `01-refs-latest-value-refs`
- Branch: `dev` (off `dev`)
- Commits: _pending — recorded in the commit below_

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | `react/refs` graduates `warn` → `error` | `.oxlintrc.json:58` | pass (`"react/refs": "error"`) |
| 2 | `pnpm lint` reports zero `react/refs` | `pnpm lint` | pass — `Found 146 warnings and 0 errors`; `grep -cE '^  ! react\(refs\)'` = 0 (baseline 104) |
| 3 | Renderer behaviour unchanged | feature suites + e2e | pass — see Gate |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | **green** — `✓ typecheck ✓ lint ✓ effect-lint ✓ verify-md-links ✓ verify-db-schema ✓ test`; desktop 335 files / 2823 passed / 5 skipped |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 22 failed / 76 passed, **pre-existing** — the same failures reproduce with all changes stashed and `dist` rebuilt; they belong to `.scratch/desktop-suite-red/` (21 `club-staff-nav` focus split; 17/18 random full-run shapes). No DOM/aria/copy changed by this sprint. |
| determinism | — | not applicable — no simulation, seeding or Player Development touched |
| save compatibility | — | not applicable — no persistence or schema touched |

## Behavior changes

None expected: every change is a ref read/write moved from render to a commit-phase effect, a
lazy-init ref replaced by `useState`, or a ref passed through an indirection. Two refs are written in
`useLayoutEffect` because their readers run outside passive-effect order (event-calendar's
`selectorRef`, read by `useSyncExternalStore`'s `getSnapshot`; `ActiveLeaguesProvider`'s
`stateRef`/`slotRef`/`setSlotRef`, read by a debounce microtask). No player-visible or seeded outcome
changes; no saves are affected.

## Decision records

- ADRs added: none
- Agent Notes written (`proposed/`): none. The pseudo-`use*` indirection that clears the compiler's
  "passing a ref to a function" inference on the two bottom-bar builders is the first occurrence, not
  a third; its rationale lives in the commit body. Route it per AGENTS.md if it recurs.
- Agent Notes promoted (`implemented/`): none

## Pre-existing failures

- **e2e, 22 specs** — stated above; verified pre-existing by stash-and-rebuild.
- **`test/renderer/leagueSelection/screen.test.tsx`** — "issues one request for a burst of rapid
  changes" is a load-sensitive timing flake: it failed once under `pnpm check:all` on the changed
  tree **and** once on the clean pre-change tree, passed 5/5 in isolation and on repeated full
  desktop runs. Not a regression; it is a new piece of information about the suite and is recorded in
  the SPRINT-PLAN so a red run is not misread. It is not filed as a ticket here because it is outside
  this effort; it warrants one.

## Deferred and known limitations

- The remaining React Compiler buckets (`set-state-in-effect`, `exhaustive-effect-dependencies`,
  `todo`, `memo-dependencies`, the small buckets) and `oxc-transform-react` stay at `warn`; they are
  tickets 02–08 of this effort.
- `event-calendar.tsx` is vendored; its selector write now uses `useLayoutEffect` and no test
  exercises the drag/draft selectors that read it.

## Review

Reviewer verdict **APPROVE**, no blocker or high findings. Findings raised and handled before commit:

- **F1 (medium)** — event-calendar `selectorRef` passive-effect write could show a stale selector
  frame; **repaired** with `useLayoutEffect`.
- **F2 (low)** — `ActiveLeaguesProvider`'s revision guard lost its synchronous defence to a debounce
  microtask; **repaired** with `useLayoutEffect` on the three refs.
- **F3 (low)** — `useSquadSession.ts` comment named `readTableSession` where it meant
  `seedFromRestored`; **repaired**.
- **F4 (low)** — the pseudo-hook workaround should be routed if it recurs; noted, no note written.
