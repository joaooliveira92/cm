# Sprint Plan

## Immediate next action

**group-h-training-and-player-development** ticket 04 (coaching assignments). Six implementation
tickets sliced (04-09); 04-08 unblocked, 09 blocked on 04-08. Spec published.

## Gate state (2026-09-14)

- **Ticket 07 (group-g) gate**: `pnpm check:all` exits 1 on pre-existing failures only. Desktop unit
  tests 65 failed / 1516 passed across 20 files; the same 20 files on clean HEAD fail the same 65.
  `verify-md-links` fails on 18 links in `.scratch/group-c-club-information/RECONCILIATION.md` and
  `.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md`, both committed earlier.
  Details in [reports/group-g-match-day.md](reports/group-g-match-day.md).

- **`pnpm check:all`**: pre-existing failures only — no regression from today's work (commits
  `b0b8f33`, `d6b44a4`, `ac553d6`, `6a07401`, `6a830f3`, `908fd0f`, `e6f0c6f`, `dd46e8d`,
  `f52c2c6`):
  - `test/renderer/managerProfile/screen.test.tsx` — mock RPC returns "unexpected response"
  - `test/renderer/chrome/shell-bottom-bar-state.test.ts` — expected `zones` mismatch
  - `test/renderer/navigation/navbar.test.tsx` and `route-index.test.ts` — route content mismatch
  - `test/renderer/router/stage2.test.ts`, `team-scout-report-route.test.ts` — `window` not defined
    (jsdom env)
  - `test/renderer/match/screen-fulltime.test.tsx` — passes.
- **e2e**: still 5 failed / 28 passed at `8f95c8f` — no e2e change this sprint.
- **typecheck**: 0 errors across all packages.
- **lint/oxlint**: pre-existing warnings only.

## Queue

1. ~~**group-c-club-information**: complete 2026-09-14. Screen 38 already shipped.~~
2. ~~**group-d-player-and-staff-records**: complete 2026-09-14. 19 screens charted, 3 implemented.~~
3. **desktop-suite-red**: 01, 02, 04 resolved. 03 claimed-and-abandoned.
4. **season-rollover-skips-conclusion**: 01 resolved.
5. **match-composition**: 01-02 resolved.
6. **group-a-reconciliation**: 03-04 resolved.
7. **team-scout-report**: complete 2026-09-13.
8. **group-e-squad-management**: pending — next unmatched spec group.
9. **group-g-match-day**: 01–09 resolved (07 Screen 97 live tactics/substitutions, 08 Screen 99
    Post-Match Summary, 09 Screens 95/100 Match Statistics, 11 Screen 103 Match Report, 2026-09-14);
    10 needs-info on decision request 03; 12, 13, 15, 16, 17 resolved; 14 claimed; 13 mounted tab bar,
    17 stoppage minute formatting shipped 2026-09-15; decision requests 01, 02, 03 open.
10. **group-h-training-and-player-development**: 01-03 resolved. Spec published. 04-08
    ready-for-agent; 09 blocked on 04-08. Created 2026-09-15.

Shipped and closed:

- **club-staff-presence**: complete 2026-09-09.
- **save-list-error-handling**: complete 2026-09-09.
- **world-data-model**: shipped.
- **group-b-reconciliation**: all 7 tickets resolved.
- **group-c-club-information**: complete 2026-09-14.
- **group-d-player-and-staff-records**: complete 2026-09-14.
- **group-e-squad-management**: complete 2026-09-14. 11 screens charted, all disposed.

## Loose instructions

Squad work committed from `.scratch/squad-instructions.md` (`6a04f33`…`5663faf`) is not a
`.scratch/<effort>/` and has no tracker entry. Whether to charter it is a human call.