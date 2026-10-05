# Validation Report: react-compiler-adoption

Written by the orchestrator to `.ai/reports/<effort>.md` after the gate, before the commit. Records
what was **observed**, not what was expected.

## Sprints

- Effort: `.scratch/react-compiler-adoption/`
- Tickets closed: `01-refs-latest-value-refs`, `02-set-state-in-effect`
- Branch: `dev` (off `dev`)
- Commits: `f4f1e232 chore(lint): clear react/refs and enforce the rule as an error`; ticket 02 in
  the commit this report ships with.

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

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | **green** on the final tree — `✓ typecheck ✓ lint ✓ effect-lint ✓ verify-md-links ✓ verify-db-schema ✓ test`; desktop 335 files / 2824 passed / 5 skipped |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 22 failed / 76 passed, **pre-existing** (ticket 01 verified by stash-and-rebuild; ticket 02 is renderer-only with no e2e-reachable path changed) |
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

No player-visible or seeded outcome changes; no saves affected.

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

- Remaining React Compiler buckets (`exhaustive-effect-dependencies`, `todo`, `memo-dependencies`, the
  small buckets) and `oxc-transform-react` stay at `warn`; tickets 03–08 of this effort.
- Reviewer low-severity note on ticket 02: `useBoundMatchRead.bindingKey` and
  `useLiveMatchCommands.attemptKey` now include `saveId` (hardened during this session); the `live`
  flag remains covered by key change.

## Review

**Ticket 01** — reviewer verdict **APPROVE**, no blocker/high. Medium/low findings repaired before
commit: event-calendar selector and the ActiveLeagues guard refs moved to `useLayoutEffect`; a
misnamed comment corrected.

**Ticket 02** — first review verdict **NEEDS_REWORK**: blocker (eight sites hid setState-in-effect
behind `void Promise.resolve().then(load)`) and high (`useLiveMatchCommands` `run()` wrapper), plus
two medium (`squadBottomBar` no longer mirrored its two effects; `CareerStateProvider` changed
`advance.waiting` semantics) and one low. All repaired; re-review verdict **APPROVE** with one
low key-completeness follow-up, applied here.
