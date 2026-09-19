# Agent Note: Set pieces ship, as a Tactic field

Status: proposed

## Problem

Two parts of this codebase had settled the same question in opposite directions, and neither knew.

Group E ticket 01 ruled [Screen 75 Set Piece Takers](../../../../docs/specs/group_e_squad_management/75_set_piece_takers.md)
`out-of-scope`, on the correct finding that `SetPieceStatusView` is hard-coded to `status: "none"` and
the **Tactic** carries no set-piece fields.

Meanwhile the shipped Tactics Overview (Screen 80) renders a set-piece panel that can only ever read
*"No set pieces configured"* — `renderer/tactics/TacticsOverviewScreen.tsx:365` — and the contract
behind it states the intent outright: `packages/contracts/src/schemas/tactics.ts:204` reads *"No set
pieces configured until Screen 86 lands."*

`out-of-scope` means ruled permanently outside this game. So as written, the Tactics Overview shipped a
panel promising a screen that would never exist, and the contract named a dead ticket. That surfaced
while transcribing the [Group E ledger](../../../../docs/specs/group_e_squad_management/RECONCILIATION.md)
under milestone M1 step 1, and was raised as group-f decision request 01 rather than settled in a
transcription pass.

## Decision

**Set pieces are in scope. Screen 75 is `deferred` to Group F Screen 86, not `out-of-scope`.**

Set-piece takers become fields on the **Tactic**. Three consequences follow:

- **Nomination is an edit to the Tactic**, so it inherits the revision-bound, idempotent save Group F
  ticket 01 built: an accepted nomination bumps the club tactic revision by exactly one, and a stale
  expected revision is refused with a typed conflict. No new write path.
- **Under [the team sheet is the Tactic](../architecture/2026-09-13-the-team-sheet-is-the-tactic.md)**,
  the takers UI is another editor of an object Squad's match-day bar and the tactics editor already
  edit. It is not a new domain object.
- **Screen 80's panel stops being dead.** It reads the same per-revision snapshot it reads today; only
  the value changes from a hard-coded `"none"`.

**Whether the match engine *uses* a nomination is deliberately left open.** Recording the takers and
displaying them is worth doing on its own; wiring them into the engine is a separate, smaller decision
that can be taken later without revisiting this one. Nothing here commits to engine behaviour, and a
nomination that the engine ignores is still a truthful display of the manager's stated plan.

Approved by the human on 2026-09-19 ("approve your recommendations on the blocking decisions").

## Alternatives considered

**Cancel set pieces; keep Screen 75 `out-of-scope` and delete the panel.** Defensible, and cheaper —
a deletion of the panel, the `SetPieceStatusView` branch and the contract comment. Rejected because
set pieces are an ordinary tactical axis for this genre, and the cost of the display half is small.
Had this been chosen, the deletion had to land in the same change; leaving the panel while ruling the
feature out is the failure mode that produced this note.

**Leave both as they are and defer the question.** This was the status quo, and it is what created the
contradiction. It leaves an empty panel indefinitely, leaves the Group E ledger holding a row its own
effort did not make, and leaves Screen 86 unscopable.

**Model set pieces as their own object rather than Tactic fields.** Rejected: it would need a second
revision-bound write path and a second thing for the match-day bar and the editor to disagree about,
against the team-sheet note.

## Consequences

- The Group E ledger's Screen 75 row moves from `out-of-scope` to `deferred`, anchored to Group F
  Screen 86.
- Group F's remainder is unblocked. Screen 86 is in scope when that group is charted, and Screen 75 is
  the Group E half of the same feature.
- A schema addition and migration are owed when Screen 86 is built. Existing Saves read as `"none"`,
  which is the state they already render, so there is no compatibility break.
