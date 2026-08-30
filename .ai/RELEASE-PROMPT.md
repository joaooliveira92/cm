# Release and Acceptance Prompt

Evaluate a release candidate — a branch about to become a build a human will actually play. Change
nothing unless an approved fix is required.

## Required checks

1. Clean tree, expected branch, lockfile committed, Node engine range satisfied.
2. `pnpm install --frozen-lockfile`, then `pnpm check:all` — every gate, observed, not inferred.
3. `pnpm --filter @cm-clone/desktop test:e2e` — the full Playwright suite against a real build.
4. `pnpm --filter @cm-clone/desktop package` — the app packages, launches, and reaches the main menu.
5. **New game**: world generation completes and produces a coherent, playable starting state.
6. **Determinism**: the same seed produces the same match twice, across separate processes; a
   chunked match resimulated mid-way reproduces its earlier result exactly.
7. **Season continuity**: a season can be played to conclusion — fixtures, table, Player Development
   at `SeasonConcluded`, and the following season starting.
8. **Save compatibility**: saves from the previous release load, or are rejected with a clear
   message and a stated migration. Silent approximation is a release blocker.
9. **Crash safety**: interrupting a save leaves the previous save loadable.
10. **Boundary posture**: context isolation on, Node integration off, preload surface unchanged from
    what the contract allows, no raw internal errors reaching the renderer.
11. **Docs**: README, CONTEXT.md, and ADRs describe what actually ships; `verify-md-links` passes.

## Behavior-change policy

For each change to a player-visible or seeded outcome, report:

- what changed, and in which system;
- the cause — the ADR, ticket, or formula change responsible;
- whether existing saves are affected, and how;
- the migration, or the explicit decision that none is needed;
- the test that now pins the new behavior.

Do not update a fixture or expected value as a repair.

## Release decision

Return exactly one of:

- `RELEASE_READY`
- `RELEASE_BLOCKED`
- `COMPATIBILITY_GATE_FAILED`

List blockers with exact evidence. Never describe a build as verified on a platform you did not run
it on, or a suite as passing when you ran a subset.
