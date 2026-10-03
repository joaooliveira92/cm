# Validation Report: save-list-error-handling — ticket 01

Written by the orchestrator after the gate, before the commit. Records what was **observed**.

## Sprint

- Effort: `.scratch/save-list-error-handling/`
- Tickets closed: `01-save-list-swallows-repository-failures`
- Branch: `dev` (per `.ai/AUTONOMOUS-AGENT.md` § Git policy — no feature branches)
- Commits: `<hash>` feat(shell): the saved-game Retry is a registered Action on both pre-career screens

## Acceptance criteria → evidence

The ticket's 2026-09-01 amendment records that the `listSaves()` UI half (failure distinguishable
from empty; Retry affordance; empty state unchanged) already shipped on both screens; the open
scope was the Action-registry requirement plus the failed-path test coverage.

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | A failed `listSaves()` is distinguishable from an empty repository: explanation + retry | pre-shipped (amendment); `main-menu.test.tsx` "explains an unreachable repository, offers Retry, and blocks nothing"; `load-career.test.tsx` "shows an error message and retry button when listSaves fails" (asserts `No saves yet.` absent) | pass (pre-existing, verified in the diff context) |
| 2 | Retry is a registered Action, not a bare `onClick` | new: `main-menu.test.tsx` / `load-career.test.tsx` assert `data-action-id="retry-save-list"`, registry membership in both scopes, and `hasActionHandler`; `main-menu.test.tsx` "retrying through the Action recovers from an unreachable repository" | pass |
| 3 | Empty-repository state unchanged on genuine success | pre-shipped empty-state specs on both screens + new main-menu recovery test ends on "No saved careers yet" | pass |
| 4 | `save-management.spec.ts` passes unchanged | not run in this boot's session — implementator ran it 3/3 ✓; file byte-untouched; stale-entry code path byte-identical to HEAD | pass with evidence from implementator's e2e run |
| 5 | Unit/component test covers the failed-`listSaves()` path | already shipped with the amendment (both screens); new tests add the Action-registration proof | pass |

## Gate (run by the orchestrator, 2026-09-09, diff applied)

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | ✗ typecheck (2 Navbar errors, baseline) · ✗ lint (1 error / 67 warnings in untouched files) · ✓ effect-lint (no violations, 591 files) · ✓ verify-md-links (860 files) · ✓ verify-db-schema · ✗ test (19 failed / 1197 passed in the 4 documented baseline files) |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | not (re)run by the orchestrator; implementator ran `save-management` 3/3, `error-paths` 1/1 ✓; its source-swap canaries showed each remaining e2e failure reproduces at HEAD |
| determinism | | not applicable — renderer-only change, nothing seeded or simulated |
| save compatibility | | not applicable — no schema, no persistence touched |

Focused runs (orchestrator-verified): `pnpm --filter @cm-clone/desktop exec vitest run test/renderer/router/main-menu.test.tsx test/renderer/router/load-career.test.tsx test/renderer/actions/inventory.test.tsx` → **3 files, 37/37 passed**. Reviewer independently ran the two router specs: **31/31 passed**.

Baseline canary: typecheck output byte-identical with this diff vs HEAD (`apps/desktop` tsc → exactly `Navbar.tsx:258,273` + pre-existing suggestions); the 4 failing test files (`scouting`, `cups`, `simulation-depth`, `live-keyboard`) are exactly the recorded baseline set; lint error (`KeyboardSpine.tsx:13` unused import) is pre-existing and in an untouched file.

## Behavior changes

None to a player-visible or seeded outcome beyond: the Retry affordance on the Main Menu and Load
Career is now also reachable/triggerable as a registered command Action (`retry-save-list`,
`mainMenu` and `loadCareer` scopes) in addition to the pointer click. No saves, seeds, or
persistence are touched.

## Decision records

- ADRs added: none.
- Agent Notes written (`proposed/`): none.
- Agent Notes promoted (`implemented/`): none — the change applies ADR-0012 / the action-model
  note's cross-scope same-id allowance; it does not cross a new decision threshold.

## Pre-existing failures

- `pnpm check:all` red at `dev` HEAD before this diff, reproduced byte-identical after: 2
  typecheck errors in `apps/desktop/src/renderer/navigation/components/Navbar.tsx` (revealKey/
  revealKeys no longer on the child component interface), 19 test failures in
  `test/main/club/scouting.test.ts`, `test/main/season/cups.test.ts`,
  `test/main/world/simulation-depth.test.ts` (FOREIGN KEY constraint) and
  `test/renderer/match/live-keyboard.test.tsx` (16 match-panel failures), lint 1 error / 67
  warnings all in untouched files. See the "Repo-level block" in `.ai/SPRINT-PLAN.md`.
- Additionally 4 pre-existing e2e failures at HEAD (router AC-15, `app.spec` ×2, keyboard AC-20)
  observed by the implementator, all baseline-proven — the plan's block does not yet record them;
  flagged for the next plan pass.
- `apps/desktop/test/matchCommands.test.ts` is a known wall-clock flake; did not trip.

## Deferred and known limitations

- A keyboard/assistive binding for the Retry Action is not added — Group A reconciliation ticket 09
  owns the browser's missing keyboard tier; the Action has no `binding`, matching the
  `retry-squad-table`/`retry-market-table` precedent.
- Reviewer LOW findings (not gates): registry-content assertion duplicated across the two specs;
  `hasActionHandler` inspects the same registration the mount-effect performs. Both recorded in the
  ticket's comments.
- The two `retry-save-list` records are the first Actions in the `mainMenu`/`loadCareer` scopes, per
  the ticket's Related note.

## Review

Reviewer: **APPROVE**. No blocker or high. Two LOW (duplicated registry assertion; near-tautology
`hasActionHandler`) and two informational (bindingless action surfaces in palette/help regardless of
repository health, consistent with the retry precedent; one-screen-mounted invariant is an
assumption). Criterion 4 recorded with evidence gathered by the implementator's e2e run; the
orchestrator's own e2e re-run was not repeated to conserve the session — stated plainly above.