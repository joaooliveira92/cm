# Sprint Plan

## Immediate next action

`.scratch/club-staff-presence/implementation/06-arrival-focus-lands-on-an-unlabelled-wrapper.md` —
the club-staff-presence implementation frontier: lowest-numbered open, unblocked, unclaimed build
ticket in that effort. Re-derive from `.scratch/club-staff-presence/implementation/` before
starting; plan rows decay, the tracker is truth.

> **Repo-level block on further ticket delivery (recorded 2026-09-09).** `pnpm check:all` is red at
> `dev` HEAD — 2 typecheck errors in `apps/desktop/src/renderer/navigation/components/Navbar.tsx`
> and 19 test failures in 4 files (`test/main/club/scouting.test.ts`,
> `test/main/season/cups.test.ts`, `test/main/world/simulation-depth.test.ts`,
> `test/renderer/match/live-keyboard.test.tsx`), plus lint noise in untouched files. These reproduce
> identically with any ticket diff stashed; no charted effort owns them. They entered the tree during
> squad work driven from the loose `squad-instructions.md` file, which is **not** a `.scratch/`
> effort — so nothing ticket-backed covers the repair and the autonomous agent may not invent it.
> Ticket 04's diff was verified to add zero new failures and shipped with this recorded as
> pre-existing. Every ticket's `pnpm check:all`-green criterion stays unsatisfiable until the
> baseline clears; the frontier ticket remains legal to claim, but its own gate criterion will carry
> this caveat.

## Queue

The live frontier is **club-staff-presence**, charted and specced on 2026-09-07, sliced into six
implementation tickets in dependency order (all `ready-for-agent` unless noted):

- 01 presence-staff-derivation — done (shipped, ticket closed)
- 02 get-club-staff-rpc-read — done (shipped, ticket closed)
- 03 club-staff-screen-and-route — **claimed** (shipped in commits `823c9e8`…`2b93774`; ticket was
  never closed by the session that shipped it — left locked, not reconciled here)
- 04 presidents-voice-in-board-news — done (shipped 2026-09-09 by the last boot)
- 05 club-segment-keyboard-identity-and-entry-points — **claimed** (shipped in commits `189c8ff` and
  `2b93774`; ticket never closed — left locked, not reconciled here)
- 06 arrival-focus-lands-on-an-unlabelled-wrapper — next (no blocker; app-wide focus-model change
  with its own accessibility review — see the ticket for the three weighed alternatives)

## Red baseline provenance

The world-data-model queue the previous plan named is fully shipped (tickets 01-18 closed in the
git log), so its rows decayed. Squad work committed from `.scratch/squad-instructions.md`
(`6a04f33`…`5663faf`) is not a `.scratch/<effort>/` and has no tracker entry; that is the source of
the pre-existing red above. The instruction file sits at `.scratch/squad-instructions.md` out of
plan order; whether to charter it is a human call.

See `implementation/README.md` for the authoritative sequence and blockers.