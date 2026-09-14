# Sprint Plan

## Immediate next action

**react-composition-audit tickets 12-16** are `ready-for-agent` and unblocked (orchestration hook + provider extraction for TransfersScreen). Also: **visual-design-language tickets 11-14** are `ready-for-agent` and unblocked (08/09 resolved).

Desktop-suite-red 03 is `Status: claimed` on disk (abandoned).

## Gate state (2026-09-12)

- **`pnpm check:all`**: pre-existing failures only — no regression from today's changes (commits
  `8e2b1d5`, `66ac833`, `e696916`, `7f94e01`, `e0cb972`, `39f923f`, `305a204`, `a321bda`, `81401f6`, `32f4c84`):
  - `test/renderer/managerProfile/screen.test.tsx` — mock RPC returns "unexpected response"
  - `test/renderer/chrome/shell-bottom-bar-state.test.ts` — expected `zones` mismatch
  - `test/renderer/navigation/navbar.test.tsx` and `route-index.test.ts` — route content mismatch
  - `test/renderer/router/stage2.test.ts`, `team-scout-report-route.test.ts` — `window` not defined
    (jsdom env)
  - `test/renderer/match/screen-fulltime.test.tsx` — **now passes** (ticket 04). 25/25 green.
- **e2e**: still 5 failed / 28 passed at `8f95c8f` — no e2e change this sprint.

## Queue

1. ~~**group-c-club-information**: complete 2026-09-14. Screen 38 (Club Staff) already shipped via `club-staff-presence`. No code changes needed.~~
2. **desktop-suite-red**: 01, 02, 04 resolved. 03 claimed-and-abandoned.
3. **react-composition-audit**: 02, 03, 07 resolved (superseded). 12-16 ready-for-agent (all resolved — shipped).
4. **season-rollover-skips-conclusion**: 01 resolved.
5. **match-composition**: 01-02 resolved.
6. **group-a-reconciliation**: 03-04 resolved (quit guard, save-list chrome).
7. **team-scout-report**: complete 2026-09-13, 8/8 (06 report screen, 07 Club-targeted scouting, 08 kept readings). TRACEABILITY row added.
8. **spec-roadmap**: its three decision requests were decided on 2026-09-13 under human delegation and recorded as Agent Notes (team sheet is the Tactic; national teams and job market deferred). Order of spec groups in `.ai/SPEC-ROADMAP.md`.

Shipped and closed:

- **club-staff-presence**: complete 2026-09-09.
- **save-list-error-handling**: complete 2026-09-09. See `.ai/reports/save-list-error-handling.md`.
- **world-data-model**: shipped. Its rows decayed.
- **group-b-reconciliation**: all 7 tickets resolved, spec.md written, ledger clean.

## Loose instructions

Squad work committed from `.scratch/squad-instructions.md` (`6a04f33`…`5663faf`) is not a
`.scratch/<effort>/` and has no tracker entry. Whether to charter it is a human call.