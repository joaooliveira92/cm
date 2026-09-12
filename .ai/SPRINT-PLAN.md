# Sprint Plan

## Immediate next action

**group-b-reconciliation is complete** — all 7 tickets resolved, spec.md written, ledger clean.
The queue below lists remaining efforts; none is actionable by an autonomous agent without human
intervention.

Desktop-suite-red 03 is `Status: claimed` on disk (abandoned). react-composition-audit 02, 03 and 07
are `needs-triage`, waiting on a maintainer.

## Gate state (2026-09-12)

- **`pnpm check:all`**: pre-existing failures only — no regression from today's changes (commits
  `8e2b1d5`, `66ac833`, `e696916`, `7f94e01`, `e0cb972`):
  - `test/renderer/managerProfile/screen.test.tsx` — mock RPC returns "unexpected response"
  - `test/renderer/chrome/shell-bottom-bar-state.test.ts` — expected `zones` mismatch
  - `test/renderer/navigation/navbar.test.tsx` and `route-index.test.ts` — route content mismatch
  - `test/renderer/router/stage2.test.ts`, `team-scout-report-route.test.ts` — `window` not defined
    (jsdom env)
  - `test/renderer/match/screen-fulltime.test.tsx` — **now passes** (ticket 04). 25/25 green.
- **e2e**: still 5 failed / 28 passed at `8f95c8f` — no e2e change this sprint.

## Queue

1. **desktop-suite-red**: 01, 02, 04 resolved. 03 claimed-and-abandoned.
2. **react-composition-audit**: 17 resolved 2026-09-10. 02, 03 and 07 are `needs-triage`, waiting on a human.

Shipped and closed:

- **club-staff-presence**: complete 2026-09-09.
- **save-list-error-handling**: complete 2026-09-09. See `.ai/reports/save-list-error-handling.md`.
- **world-data-model**: shipped. Its rows decayed.

## Loose instructions

Squad work committed from `.scratch/squad-instructions.md` (`6a04f33`…`5663faf`) is not a
`.scratch/<effort>/` and has no tracker entry. Whether to charter it is a human call.
