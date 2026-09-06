# Continue and Advance Time

Screen 23 of the Group B import, [23_continue_and_advance_time.md](../../docs/specs/group_b_global_navigation_and_inbox/23_continue_and_advance_time.md),
reconciled against what this game has already decided about Continue.

The import does not supply the design. Two Agent Notes do, and both are still `proposed`:

- [Continue as the global career loop](../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md)
  — placement, label, the stop set, one structured result per press, boundary-aware readiness.
- [The human Fixture's pre-match boundary](../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md)
  — the stop before the human's Matchday. Split out as its own effort, `.scratch/human-fixture-pre-match-boundary/`,
  because it is the riskiest transaction in the game and does not fit beside the surface work here.

The import supplies acceptance criteria, not requirements. Its multiplayer, host-migration,
permission, career-revision, and cancellation material is on axes this repo has already ruled out;
ticket 01 registers that rather than building it.

## What is already shipped

Continue lives in the career chrome, renders from the `continue` Action record with its `Space`
binding, and the Calendar advance resolves every due Fixture to the next boundary. A pure readiness
module classifies blockers and advisories. None of that is re-opened here.

## What these tickets close

- The advance's result is discarded, so nothing tells the player why Continue stopped, and a failed
  advance is silent outside the League table.
- Continue exists twice — the League table still owns its own advance control, which both notes
  above say was removed.
- The advance is neither transactional nor single-flight; the disabled button is its only guard.
