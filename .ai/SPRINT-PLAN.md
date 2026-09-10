# Sprint Plan

## Immediate next action

`.scratch/react-composition-audit/issues/04-leagueselection-compound-components.md` — the
react-composition-audit frontier: oldest live effort with open tickets after save-list-error-handling
closed, its lowest-numbered open, unblocked, unclaimed decision ticket (`ready-for-agent`, verified
2026-09-09). This is a charted map with a spec in the handoff — route by phase (one decision ticket
per session, cm-wayfinder). Re-derive from `.scratch/react-composition-audit/` before starting; plan
rows decay, the tracker is truth.

> **Repo-level block on further ticket delivery (recorded 2026-09-09).** `pnpm check:all` is red at
> `dev` HEAD — 2 typecheck errors in `apps/desktop/src/renderer/navigation/components/Navbar.tsx`
> and 19 test failures in 4 files (`test/main/club/scouting.test.ts`,
> `test/main/season/cups.test.ts`, `test/main/world/simulation-depth.test.ts`,
> `test/renderer/match/live-keyboard.test.tsx`), plus lint noise in untouched files. The desktop e2e
> suite additionally carries 4 pre-existing failures at HEAD (router AC-15, `app.spec` ×2, keyboard
> AC-20), same match-day/squad territory. These reproduce
> identically with any ticket diff stashed; no charted effort owns them. They entered the tree during
> squad work driven from the loose `squad-instructions.md` file, which is **not** a `.scratch/`
> effort — so nothing ticket-backed covers the repair and the autonomous agent may not invent it.
> Ticket 04's diff was verified to add zero new failures and shipped with this recorded as
> pre-existing. Every ticket's `pnpm check:all`-green criterion stays unsatisfiable until the
> baseline clears; the frontier ticket remains legal to claim, but its own gate criterion will carry
> this caveat.

## Queue

The live frontier is **react-composition-audit**, charted 2026-09-01, specced, frontier at ticket 04.
The two efforts this plan previously charted are fully shipped:

- **club-staff-presence** — complete 2026-09-09 (06 resolved and shipped locally as `0aff906`;
  tickets 01/02/04 `done`, 03/05 shipped-and-claimed, all six terminal).
- **save-list-error-handling** — complete 2026-09-09 (ticket 01 `resolved`; retry shipped as a
  registered Action; see `.ai/reports/save-list-error-handling.md`).
- **world-data-model** — ships fully as before; rows decayed.

## Red baseline provenance

The world-data-model queue the previous plan named is fully shipped (tickets 01-18 closed in the
git log), so its rows decayed. Squad work committed from `.scratch/squad-instructions.md`
(`6a04f33`…`5663faf`) is not a `.scratch/<effort>/` and has no tracker entry; that is the source of
the pre-existing red above. The instruction file sits at `.scratch/squad-instructions.md` out of
plan order; whether to charter it is a human call.

See `implementation/README.md` for the authoritative sequence and blockers.