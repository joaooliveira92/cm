# Sprint Plan

## Immediate next action

`.scratch/react-composition-audit/issues/17-data-table-edge-fade-resync.md` is the
react-composition-audit frontier: the lowest-numbered open, unblocked, unclaimed `ready-for-agent`
ticket. Tickets 02, 03 and 07 are `needs-triage` and wait on a maintainer. Re-derive the frontier
from `.scratch/react-composition-audit/` before starting; plan rows decay, and the tracker is truth.

`pnpm check:all` is **green** at `dev` as of 2026-09-10, after desktop-suite-red 01. See
[`.ai/reports/desktop-suite-red.md`](reports/desktop-suite-red.md). The 2026-09-09 red baseline
(typecheck, scouting/cups/simulation-depth/live-keyboard) no longer reproduces. Any future red
failure is new, so do not treat it as pre-existing.

## Queue

1. **react-composition-audit**: charted 2026-09-01, specced. Ticket 17 (edge-fade re-sync, a
   regression from ticket 10) is `ready-for-agent`. 02, 03 and 07 are `needs-triage`. Everything
   else is resolved.
2. **desktop-suite-red**: ticket 01 resolved 2026-09-10 and 02 resolved. 03 (let e2e pin a match
   seed) is `ready-for-agent`.

Shipped and closed:

- **club-staff-presence**: complete 2026-09-09.
- **save-list-error-handling**: complete 2026-09-09. See `.ai/reports/save-list-error-handling.md`.
- **world-data-model**: shipped. Its rows decayed.

## Loose instructions

Squad work committed from `.scratch/squad-instructions.md` (`6a04f33`…`5663faf`) is not a
`.scratch/<effort>/` and has no tracker entry. Whether to charter it is a human call.
