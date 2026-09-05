# 01: The desktop suite is red, and one primitive probably explains most of it

Type: bug
Status: ready-for-agent

## What was measured

Found during the 2026-09-05 round-2 folder audit, while establishing a baseline before moving
files. Full `apps/desktop` suite at `aa58e9a`, **before any of that audit's commits**:

```
Test Files  11 failed | 87 passed (99)
     Tests  25 failed | 968 passed (1002)
```

This is not a regression from the audit. The same 25 fail at the audit's session-start commit.
`test/table-save-switch.test.tsx` also fails identically three commits further back at `5f8b66f`,
so the rot predates all of it.

**`pnpm check:all` therefore cannot be green.** `AGENTS.md` tells every agent to run it after each
task, and each ticket in `main-process-decomposition/` carries a "check:all is green" checkbox that
nobody can honestly tick. A gate that is known-red stops being a gate: it trains agents to read a
failure list and shrug, which is how the 26th failure gets in unnoticed.

## The failures are not 25 independent bugs

Group them by what they touch and nearly all are one interaction -- driving a filter or a select:

| Spec | Failing on |
|---|---|
| `ui-select.test.tsx` | "opens and selects" **times out at 5000ms** |
| `table-grid-navigation.test.tsx` (5) | Market name search + position filter; selection cleared when a row is filtered out |
| `table-focus-restore.test.tsx` (3) | focus restoration after a filter removes the focused row |
| `table-save-switch.test.tsx` | asserts a position filter was recorded; gets `[]` |
| `active-leagues-grid.test.tsx` (4), `active-leagues-screen`, `active-leagues-workspace` | changing a depth/option selector |
| `league-selection-screen.test.tsx` (3) | mode selector, debounced estimation |
| `club-selection-screen.test.tsx`, `level1-a11y.test.tsx`, `tactics-keyboard-reachability.test.tsx` | reaching/activating a select control |

`ui-select` is the primitive the rest of these drive. Its own spec timing out on *open* is the
tell: if the vendored Base UI `Select` never opens under jsdom, every test that filters through
one fails downstream, and each looks like its own screen's bug.

**Start at `src/renderer/components/ui/select.tsx` and `test/ui-select.test.tsx`.** Fix the open
interaction, re-run the whole suite, and re-count before touching any individual screen spec. The
expected outcome is that most of the table cascades clear at once. See [[shadcn-component-layer]]:
these primitives are vendored and customized in place, so the bug is ours, not upstream's.

Three in `season.test.ts` are unrelated to the above (background competition fixtures, a tie across
the depth boundary, rollover club exchange) and need their own diagnosis.

## Constraints

- **Do not "fix" a failure by weakening its assertion.** These specs encode acceptance criteria
  (AC-27, AC-30, AC-31, AC-22) traced in `.ai/TRACEABILITY.md`.
- Some failures are **load-sensitive timeouts**. Two full suites run concurrently produced 26
  failures where a quiet machine produced 25, and `matchday-screen-fulltime.test.tsx` fails under
  contention but passes in isolation. Re-run a suspected fix in isolation before believing it, and
  do not tune `testTimeout` upward to make a real hang look green.

- [ ] Root cause of the `ui-select` open timeout is named, not worked around.
- [ ] Full suite re-counted after that one fix, with the new number recorded here.
- [ ] Any remaining failures triaged individually, with the `season.test.ts` three separated out.
- [ ] `pnpm check:all` is green -- or, if that is not reachable in one pass, this file records the
      exact remaining list so the next agent starts from a known number rather than re-measuring.
