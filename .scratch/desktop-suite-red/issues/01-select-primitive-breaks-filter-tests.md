# 01: The desktop suite is red, and one primitive probably explains most of it

Type: bug
Status: resolved

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

- [x] Root cause of the `ui-select` open timeout is named, not worked around.
- [x] Full suite re-counted after that one fix, with the new number recorded here.
- [x] Any remaining failures triaged individually, with the `season.test.ts` three separated out.
- [x] `pnpm check:all` is green -- or, if that is not reachable in one pass, this file records the
      exact remaining list so the next agent starts from a known number rather than re-measuring.

## Comments

### 2026-09-05 — re-count after the Base UI select migration

Recorded here so the next agent starts from a number instead of re-measuring, per the last checkbox.

`apps/desktop` alone (`npx vitest run`), on `1e4816a`:

```
Test Files  1 failed | 98 passed (99)
     Tests  1 failed | 1005 passed (1006)
  Duration  1349.88s
```

**25 failures → 1.** The select-primitive theory in this ticket held: fixing how the suites drive
the vendored Base UI `Select` cleared the whole table/filter cascade at once, exactly as predicted.

The single survivor is one of the three `season.test.ts` failures this ticket had already separated
out as unrelated:

- `season.test.ts:285` — "a background competition's fixtures resolve as their dates pass without
  stopping the human" — **still failing**
- the drawn-tie/depth-boundary and rollover-club-exchange cases — **now passing**

It touches no renderer code (zero references to the table stack), so it is independent of
everything above and needs its own diagnosis.

Two caveats on the number, both in the honest direction:

- Scope is `apps/desktop` only, not `pnpm -r test` — the `packages/` suites were not in this run.
- The run overlapped with e2e work on the same machine, and this ticket warns that contention
  inflates the count. So 1 is an upper bound; a quiet machine may show 0.

Separately, the renderer bug found while repairing the e2e suite —
`.scratch/renderer-render-loop/` — was a runaway re-render on Squad and Transfers driven by
TanStack's `autoResetPageIndex`. It is fixed, and is not related to this ticket's select-primitive
cause despite both surfacing in the same table screens.

## Answer

2026-09-10. `pnpm check:all` is green: exit 0, all six gates pass. Desktop is 134 files / 1222
tests, shared 446, contracts 63, game-engine 50.

- **Select primitive**: fixed by the Base UI select migration, per the 2026-09-05 comment above.
- **`season.test.ts:285`**, the last survivor of that comment: it now runs as
  `test/main/season/advance.test.ts` and passes in the full suite.
- **The 2026-09-09 baseline in `.ai/SPRINT-PLAN.md`** (2 typecheck errors, 19 failures in
  scouting/cups/simulation-depth/live-keyboard) had already cleared by `5d58f7c`. That commit's
  baseline showed tests and typecheck green.
- **The last red was `oxlint`**, with five `no-unused-vars` errors in `apps/desktop/src/renderer/table/`
  left over from the ticket-10 (`f464885`) and ticket-11 (`ee1b029`) refactors. All five were dead
  code: `useTableKeyboard` never cycled sort (only the header click does, now in
  `DataTableHeader.tsx`), and `TablePanelContent` never read `filters` (`TablePanel` derives the
  view state upstream). The unused inputs and props were removed along with their call-site
  arguments.

The first full run with this fix had 9 timeouts in `test/main/` (season, transfers, world). It
overlapped another session's vitest run: 1046s against a quiet 694s. The same 9 files ran alone
and passed (69/69), and a second full `check:all` on a quiet machine passed. This is the
load-sensitivity the Constraints section warns about, not a regression.

The review turned up an out-of-scope regression from `f464885`: the table edge fades no longer
re-measure on scroll or on row/column changes. It is filed as
[react-composition-audit 17](../../react-composition-audit/issues/17-data-table-edge-fade-resync.md).
