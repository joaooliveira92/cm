# Validation Report: react-compiler-adoption

Written by the orchestrator to `.ai/reports/<effort>.md` after the gate, before the commit. Records
what was **observed**, not what was expected.

## Sprints

- Effort: `.scratch/react-compiler-adoption/`
- Tickets closed: `01-refs-latest-value-refs`, `02-set-state-in-effect`,
  `03-exhaustive-effect-dependencies`, `04-todo-diagnostics`
- Branch: `dev` (off `dev`)
- Commits: `f4f1e232 chore(lint): clear react/refs…`; `99aac826 chore(lint): clear
  set-state-in-effect…`; ticket 03 in the commit this report ships with; ticket 04 in the commit
  this report ships with.

## Acceptance criteria → evidence

### Ticket 01 — `react/refs`

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Rule graduates `warn` → `error` | `.oxlintrc.json:58` | pass |
| 2 | `pnpm lint` zero `react/refs` | `pnpm lint` | pass — 0 (baseline 104) |
| 3 | Renderer behaviour unchanged | feature suites + e2e | pass — see Gate |

### Ticket 02 — `react/set-state-in-effect`

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Rule graduates `warn` → `error` | `.oxlintrc.json:59` | pass |
| 2 | `pnpm lint` zero `react/set-state-in-effect` | `pnpm lint` | pass — 0 (baseline 27) |
| 3 | Behaviour change justified per site | per-site in ticket 02 `## Answer` + report | pass after repair |

### Ticket 03 — `react/exhaustive-effect-dependencies`

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Rule graduates `warn` → `error` | `.oxlintrc.json:60` | pass |
| 2 | `pnpm lint` zero `react/exhaustive-effect-dependencies` | `pnpm lint` | pass — 0 (baseline 25) |
| 3 | No `eslint-disable-line react-hooks/exhaustive-deps` in the renderer | `grep -rn` | pass — none (was 9) |

### Ticket 04 — `react/todo`

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Rule graduates `warn` → `error` (or documented `warn`) | `.oxlintrc.json:61` | pass — `error` |
| 2 | `pnpm lint` zero `react/todo` | `pnpm exec oxlint … \| grep -c "react(todo)"` | pass — 0 (baseline 14) |
| 3 | Behaviour unchanged by the restructures | focused suites + new `streaming-failure.test.tsx` | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | **green** on the final tree — `✓ typecheck ✓ lint ✓ effect-lint ✓ verify-md-links ✓ verify-db-schema ✓ test`; desktop 336 files / 2825 passed / 5 skipped |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 22 failed / 76 passed, **pre-existing** (ticket 01 verified by stash-and-rebuild; tickets 02 and 04 are renderer-only with no e2e-reachable path changed — ticket 04's count was re-observed unchanged) |
| determinism | — | not applicable — no simulation, seeding or Player Development touched |
| save compatibility | — | not applicable — no persistence or schema touched |

The gate flaked intermittently under `pnpm -r test` load on `leagueSelection/screen.test.tsx` and
`grid-navigation.test.tsx`; both pass in isolation and on repeated full desktop runs, and
`leagueSelection` also failed on a clean pre-change tree, so both are pre-existing load-sensitive
timing flakes, not regressions. A single clean `check:all` is recorded above.

## Behavior changes

Ticket 01: none expected; every change moved a ref read/write from render to a commit-phase effect,
replaced a lazy-init ref with `useState`, or passed a ref through an indirection. Two refs use
`useLayoutEffect` because their readers run outside passive-effect order.

Ticket 02: the render-phase derives and keyed read stores shift some updates one commit earlier or
show `loading` for a refetch window rather than via a synchronous setter — each justified per site in
the ticket. `squadBottomBar` was repaired to mirror the two effects it replaced exactly and gained a
regression test; `CareerStateProvider` keeps the previous report during a re-advance. Four sites
suppress with an explicit reason (three vendored `components/ui`/`components/reui`, plus
`CommentaryScreen` and `match/useMatchControl`, both intrinsic external-store/ref-owned syncs).

Ticket 04: none expected. Eleven handlers moved their `finally` cleanup after the `try/catch`, one
`??=` became an `if`, and one default-parameter member read became a body-local. Every control-flow
edge was traced: no in-`try` return now skips cleanup; the two sites with in-`try` returns
(`useCommentaryCommands`, `CommentaryScreen.load`) assign a local and fall through; `streaming.ts`'s
failure branch became an `else` and its recursive quick-poll tail moved after `endFetch()`, still
gated by `!stream.streamEnded()` (`stream.ts:137-140`), which a failed read sets. No player-visible or
seeded outcome changes; no saves affected.

## Decision records

- ADRs added: none
- Agent Notes written (`proposed/`): none. The `eslint-disable-next-line react/set-state-in-effect`
  escape and the keyed-read-store idiom are recorded in the tickets and commit bodies. Route them per
  AGENTS.md if a third occurrence appears.
- Agent Notes promoted (`implemented/`): none

## Pre-existing failures

- **e2e, 22 specs** — the `.scratch/desktop-suite-red/` set.
- **`leagueSelection/screen.test.tsx`** and **`grid-navigation.test.tsx`** — load-sensitive timing
  flakes (`findByText` timeouts under worker contention); reproduce on a clean tree / pass in
  isolation. Recorded in the SPRINT-PLAN so a red run is not misread. They warrant a robustness
  ticket of their own; not filed here because they are outside this effort.

## Deferred and known limitations

- Remaining React Compiler buckets (`memo-dependencies`, the small buckets) and
  `oxc-transform-react` stay at `warn`; tickets 05, 07 and 08 of this effort.
- Ticket 04 records one vendored `components/reui/**` `react/todo` exemption in `.oxlintrc.json`;
  ticket 07 extends that block for the 12 vendored `rule-suppression` sites.
- Reviewer low-severity note on ticket 02: `useBoundMatchRead.bindingKey` and
  `useLiveMatchCommands.attemptKey` now include `saveId` (hardened during this session); the `live`
  flag remains covered by key change.

## Review

**Ticket 01** — reviewer verdict **APPROVE**, no blocker/high. Medium/low findings repaired before
commit: event-calendar selector and the ActiveLeagues guard refs moved to `useLayoutEffect`; a
misnamed comment corrected.

**Ticket 02** — first review verdict **NEEDS_REWORK**: blocker (eight sites hid set-state-in-effect
behind `void Promise.resolve().then(load)`) and high (`useLiveMatchCommands` `run()` wrapper), plus
two medium (`squadBottomBar` no longer mirrored its two effects; `CareerStateProvider` changed
`advance.waiting` semantics) and one low. All repaired; re-review verdict **APPROVE** with one
low key-completeness follow-up, applied here.

**Ticket 03** — verdict **APPROVE**, no blocker/high. The reviewer traced every changed effect's
re-run set and found no effect that loops, extra-fetches, or misses a refresh. Four low notes: the
vendored `components/reui/` `-next-line` suppressions leave the bucket cleared only modulo suppression
(deferred to bucket 07, recorded on the ticket); `useScrollEdges`' empty-table guard; `CareerShell` no
longer resets scroll on the mount pass (a likely fix, noted in the commit body); and missing
hook-level tests for the refactors. None is a gate.

**Ticket 04** — verdict **APPROVE**, no blocker/high. The reviewer traced every `try/finally` rewrite
for a changed control-flow edge and confirmed equivalence, including `streaming.ts`'s failed-poll tail
(gated by `streamEnded()`) and `useTacticDraft.save`'s optional-parameter substitution. Four low
notes: the `## Answer` said `time-grid.tsx` carried "the only remaining `??=`" when a second sits in
`event-calendar-lib.tsx:416` inside a helper the compiler does not analyse — **corrected in the ticket
before commit**; a one-assignment `finish` helper in `useMatchControl` (left, judgement call); the
`endFetch()` invariant in `streaming.ts` is now call-signature-dependent rather than `finally`-guaranteed
(latent, unreachable today); and the new test covers the non-`quick` path, not the `quick` tail or the
`catch` branch (coverage gap, no wrong behaviour untested). None is a gate.
