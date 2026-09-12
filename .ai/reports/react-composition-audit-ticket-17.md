# Validation Report: react-composition-audit, ticket 17

Written by the orchestrator after the gate, before the commit. It records what was **observed**.

## Sprint

- Effort: `.scratch/react-composition-audit/`
- Tickets closed: `17-data-table-edge-fade-resync`
- Branch: `dev` (per `.ai/AUTONOMOUS-AGENT.md` § Git policy)
- Commit: `fix(table): re-sync the edge fades on scroll, rows and columns`

## Changed files

| File | Change |
|---|---|
| `apps/desktop/src/renderer/table/useScrollEdges.ts` | returns `{ edges, syncEdges }`; `syncEdges` keeps the previous object when unchanged |
| `apps/desktop/src/renderer/table/DataTable.tsx` | `onScroll={syncEdges}`, `extraDeps` of row and visible-column counts, `initialScrollLeft` restore declared before the hook |
| `apps/desktop/test/renderer/table/scroll-edge-fades.test.tsx` | new: four jsdom tests on the `data-scroll-edge` fades |
| `.agents/notes/implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md` | stale pointer: the `scrollEdges` rule lives in `useScrollEdges.ts` |

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Stubbed metrics + `scroll` update the fades; fails at `HEAD` | "follow the scroll position when the container scrolls" | pass; failed at `8f95c8f` |
| 2 | Rows arriving after mount turn the right fade on | "turn the right fade on when rows arrive after mount" | pass; failed at `8f95c8f` |
| 3 | A saved `initialScrollLeft` shows the left fade | "show the left fade on a mount that restores a saved scroll offset" | pass; failed at `8f95c8f` |
| — | Visible-column dependency (extra) | "turn the right fade on when hidden columns are shown" | pass; failed at `8f95c8f` |
| 4 | `pnpm check:all` passes | full gate below | every gate green except one pre-existing flaky spec |

Failing-first evidence: with the fix, `npx vitest run test/renderer/table/scroll-edge-fades.test.tsx`
passes 4 of 4. At `8f95c8f` all four fail, and in each one the mount assertion passes before the
post-change assertion fails (e.g. `expected { left: false, right: true } to deeply equal
{ left: true, right: true }`). The reviewer reproduced this independently by stashing only the two
source files.

## Gate (run by the orchestrator, 2026-09-10)

Run in a detached worktree at `8f95c8f` with only this ticket's files copied in. The shared worktree
held another session's uncommitted edits.

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | ✗: typecheck ✓, lint ✓, effect-lint ✓, verify-md-links ✓, verify-db-schema ✓, test ✗ with shared 446 ✓, contracts 63 ✓, game-engine 50 ✓, desktop `1 failed \| 1225 passed (1226)` |
| flake check | `npx vitest run test/renderer/match/screen-fulltime.test.tsx` | failed alone with the diff; at bare `8f95c8f`, three runs gave passed, passed, **failed** |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | ✗ `5 failed`, `28 passed` |
| e2e baseline | same command at bare `8f95c8f` | ✗ `5 failed`, `28 passed`, the **same five** |
| final bytes | `pnpm run lint`, `pnpm -r typecheck`, `npx vitest run test/renderer/table test/renderer/transfers test/renderer/squad` | lint exit 0 (0 errors) · typecheck all Done · `16 passed`, `158 passed` |
| determinism | | not applicable: renderer-only |
| save compatibility | | not applicable: no persistence change |

The "final bytes" row re-checks the comment-only wording fix from review (L1), applied after the full
run. `diff` shows only comment lines changed between the gated and committed files.

The unit failure:

```
FAIL test/renderer/match/screen-fulltime.test.tsx > MatchDayScreen at full time — the settled feed stays on screen (no lost commentary) > keeps the scoreboard, the Full time status, the revealed feed and the final score row
TestingLibraryElementError: Unable to find an element with the text: /Final score: Home FC 2 - 1 Away FC/.
```

The five e2e failures, identical at both commits:

```
e2e/app.spec.ts:20:1 › Squad opens on the position list and the View selector swaps it for a table of the same squad
e2e/app.spec.ts:90:1 › Match Day starts a match, reveals a feed, and applies a live control command
e2e/journeys.spec.ts:90:1 › a substitution is driven by keyboard through the match day live control panel (AC-33)
e2e/keyboard.spec.ts:156:1 › Escape closes only the topmost transient layer (AC-20)
e2e/router.spec.ts:184:1 › Match Day arrival resumes a pending match instead of starting one (AC-15)
```

`app.spec.ts:20` fails at `expect(window.locator("h1")).toBeVisible()` (line 23), before any table
renders. The match-day specs fail waiting for the "Start match" button.

## Behavior changes

The horizontal overflow fades update again on scroll, on row arrival, on column toggling, and on a
restored offset, as before `f464885`. No seeded or persisted outcome changes.

## Decision records

- ADRs added: none
- Agent Notes written (`proposed/`): none
- Agent Notes promoted (`implemented/`): none; one stale pointer corrected in an implemented note
- Map: Decisions-so-far entry for 17 appended

## Pre-existing failures

- **`screen-fulltime.test.tsx`** flakes about 1 run in 3 at bare `8f95c8f` and fails fast, not by
  timeout. Filed as `.scratch/desktop-suite-red/issues/04-fulltime-spec-flakes.md`.
- **Five e2e failures**, identical at bare `8f95c8f`: one in the Squad shell and four in match-day
  territory. Not owned by any ticket. The 2026-09-09 plan recorded four of them, plus AC-33 now.

## Deferred and known limitations

- The Shift+Arrow re-measure relies on Chromium firing `scroll` for a programmatic write. No test
  covers it (jsdom cannot, and no e2e spec reads the fades), and it has not been checked in the
  running app.
- The reviewer's out-of-scope follow-up candidates are listed in the ticket's Answer: a
  `ResizeObserver` for same-count width changes, the saved-offset clamp before rows exist, latent
  Shift+Arrow gating, the duplicated `pinnedStyle`, and a stale note pointer.

## Review

Reviewer verdict: **APPROVE**, with no blocker, high or medium findings.

- **L1:** ordering-comment wording. Fixed in `DataTable.tsx` and the spec header.
- **L2:** the restore-before-hook order is enforced by a comment and a test. This is a design
  alternative; no change.
- **L3, L4:** out of scope and recorded, as above.
