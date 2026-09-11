# Sprint Plan

## Immediate next action

`.scratch/desktop-suite-red/issues/03-reach-the-match-seed-from-e2e.md` is the desktop-suite-red
frontier: the lowest-numbered open, unblocked, unclaimed `ready-for-agent` ticket. 04 (the
`screen-fulltime` flake) follows it. react-composition-audit has no agent-ready ticket left: 02, 03
and 07 are `needs-triage` and wait on a maintainer. Re-derive the frontier from `.scratch/` before
starting; plan rows decay, and the tracker is truth.

## Gate state (2026-09-10)

- **`pnpm check:all`**: every gate green at `8f95c8f` (see
  [`.ai/reports/desktop-suite-red.md`](reports/desktop-suite-red.md)), except the pre-existing flake
  `test/renderer/match/screen-fulltime.test.tsx`, which fails about 1 run in 3. It is tracked as
  desktop-suite-red 04. The desktop suite also carries load-sensitive `test/main/` timeouts when
  another vitest process shares the machine, so re-run any timeout alone before believing it.
- **e2e**: 5 failed / 28 passed at `8f95c8f`, before and after react-composition-audit 17:
  - `app.spec.ts:20` (Squad view selector; fails at `h1` visible)
  - `app.spec.ts:90` (Match Day)
  - `journeys.spec.ts:90` (AC-33)
  - `keyboard.spec.ts:156` (AC-20)
  - `router.spec.ts:184` (AC-15)

  Four stop at a missing "Start match" button. No ticket owns them.

## Queue

1. **desktop-suite-red**: 01 and 02 resolved. 03 (let e2e pin a match seed) and 04 (`screen-fulltime`
   flake) are `ready-for-agent`.
2. **react-composition-audit**: charted 2026-09-01, specced. 17 (edge-fade re-sync) resolved
   2026-09-10. 02, 03 and 07 are `needs-triage`, waiting on a human.

Shipped and closed:

- **club-staff-presence**: complete 2026-09-09.
- **save-list-error-handling**: complete 2026-09-09. See `.ai/reports/save-list-error-handling.md`.
- **world-data-model**: shipped. Its rows decayed.

## Loose instructions

Squad work committed from `.scratch/squad-instructions.md` (`6a04f33`…`5663faf`) is not a
`.scratch/<effort>/` and has no tracker entry. Whether to charter it is a human call.
