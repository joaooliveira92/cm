# Validation Report: desktop-suite-red, ticket 01

Written by the orchestrator after the gate, before the commit. It records what was **observed**.

## Sprint

- Effort: `.scratch/desktop-suite-red/`
- Tickets closed: `01-select-primitive-breaks-filter-tests`
- Branch: `dev` (per `.ai/AUTONOMOUS-AGENT.md` § Git policy, no feature branches)
- Commit: `fix(table): drop unused bindings left by the DataTable and TablePanel splits`

## Acceptance criteria → evidence

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | Root cause of the `ui-select` open timeout named | 2026-09-05 comment in the ticket: the suites drove the vendored Base UI `Select` wrongly; the select migration fixed it | pass (already shipped) |
| 2 | Full suite re-counted after that fix | 2026-09-05 comment: 25 → 1 failure on `1e4816a` | pass (already shipped) |
| 3 | Remaining failures triaged, `season.test.ts` separated | the last survivor, "a background competition's fixtures resolve…", now lives in `test/main/season/advance.test.ts` and passes in the full suite below | pass |
| 4 | `pnpm check:all` is green | second full run below: exit 0 | pass |

## Baseline (at `ee1b029`, clean tree, before any change)

`pnpm check:all` → exit 1. Only `lint` failed, on five `eslint(no-unused-vars)` errors:

```
apps/desktop/src/renderer/table/TablePanelContent.tsx:22:3: error eslint(no-unused-vars): Parameter 'filters' is declared but never used.
apps/desktop/src/renderer/table/useTableKeyboard.ts:4:10: error eslint(no-unused-vars): Identifier 'cycleSort' is imported but never used.
apps/desktop/src/renderer/table/useTableKeyboard.ts:42:5: error eslint(no-unused-vars): Variable 'onSortChange' is declared but never used.
apps/desktop/src/renderer/table/useTableKeyboard.ts:43:5: error eslint(no-unused-vars): Variable 'table' is declared but never used.
apps/desktop/src/renderer/table/DataTable.tsx:3:28: error eslint(no-unused-vars): Identifier 'effectiveActiveId' is imported but never used.
```

The other gates passed: typecheck, effect-lint, verify-md-links, verify-db-schema, and test (shared
446, contracts 63, game-engine 50, desktop 134 files / 1222 tests). The 2026-09-09 red baseline
recorded in `SPRINT-PLAN.md` had already cleared.

## Gate (run by the orchestrator, 2026-09-10)

Run in a detached git worktree at `5d58f7c` with only this ticket's four-file diff applied, because
the shared worktree held another session's uncommitted edits.

| Gate | Command | Result |
|---|---|---|
| check:all (run 1) | `pnpm check:all` | ✗: typecheck ✓, lint ✓, effect-lint ✓ (613 files), verify-md-links ✓, verify-db-schema ✓, test ✗ with desktop `9 failed \| 1213 passed (1222)`, all `Test timed out` in `test/main/` (see below) |
| isolation re-run | `npx vitest run` on the 9 files | `Test Files 9 passed (9)`, `Tests 69 passed (69)` |
| check:all (run 2, quiet machine) | `pnpm check:all` | **✓ exit 0**: typecheck ✓, lint ✓, effect-lint ✓, verify-md-links ✓, verify-db-schema ✓, test ✓ (shared 37 files / 446 tests, contracts 2 / 63, game-engine 5 / 50, desktop 134 / 1222) |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | not run: the diff only removes props and inputs that nothing read, so no rendered output or handler changed. Typecheck proves no caller depends on them. |
| determinism | | not applicable: renderer-only change |
| save compatibility | | not applicable: no persistence or schema change |

Run 1's timed-out tests: `season/advance` (background competition fixtures),
`season/cups` (tie across the depth boundary), `season/retention-match-streams`,
`season/retention-participation`, `season/rollover-closed-world`, `season/rollover-exchange`,
`transfers/incoming-bids` (fresh bid in a later window), `world/competition-participants`, and
`world/world-determinism` (broader selection extends a world). That run overlapped another
session's vitest process: desktop took 1046s against 694s in run 2. None of the nine files
import renderer code.

## Behavior changes

None. The removed values were never read. Header click sorting still reaches `onSortChange` through
the table context in `DataTableHeader.tsx`.

## Decision records

- ADRs added: none
- Agent Notes written (`proposed/`): none
- Agent Notes promoted (`implemented/`): none

## Pre-existing failures

None at the baseline beyond the five lint errors this ticket repaired. The 67 oxlint warnings do not
fail the gate and were left alone.

## Deferred and known limitations

- **Edge-fade regression from `f464885`** (found in review, out of scope): `useScrollEdges` lost its
  re-sync on scroll, on row/column changes and after Shift+Arrow. Filed as
  [react-composition-audit 17](../../.scratch/react-composition-audit/issues/17-data-table-edge-fade-resync.md).
  `DataTableRootProps.table` is now unread, but was kept on purpose because that fix needs it.

## Review

Reviewer verdict: **APPROVE**, with no blocker, high or medium findings.

- **Low:** the `table` prop is now unread; kept for ticket 17.
- **Low:** ticket bookkeeping. The checkboxes and the stale `season.test.ts:285` note were resolved
  in the Answer.

The edge-fade regression was confirmed with before/after evidence and routed to ticket 17. No
decision request was needed.
