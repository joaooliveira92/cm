# Agent Note: Scout resource & assignment model

Status: proposed

## Problem

The Scouting milestone needs a resource and assignment model for Scouts: how many a human club has,
how a Scout is assigned to and unassigned from a Player, whether multiple Scouts can stack on one
Player, what happens to Scouting Progress when a Scout is reassigned elsewhere, whether Free Agents
need special-case treatment, and what happens to an in-flight assignment when its target Player
changes club (into the human's own squad, into another club, or leaves the game).

## Proposal

Scout count derives from Stature Tier via a fixed `packages/shared` tier→count table (exact counts
are tuning data, not fixed here), set once at Season start — the same derivation pattern and timing
already used for Transfer Budget and Wage Budget.

Assignment is strict 1:1: a club's N Scouts fill at most N simultaneous assignment slots, and a given
Player can have at most one Scout on them at a time — no stacking multiple Scouts on one target to
speed up Progress.

Two commands: `AssignScout(player)` and `UnassignScout(player)`. `AssignScout` fails if all N slots
are already occupied — it does not implicitly reassign the least-recently-assigned Scout. The manager
must call `UnassignScout` on an existing assignment first if they want to redirect a Scout.

Scouting Progress is stored as a percentage per (human club, Player) pair. There is no separate
"paused" status: Progress simply stops advancing while its Player has no active Scout assigned, and
resumes advancing when reassigned. "Currently assigned" is a derived fact (does an active
`ScoutAssigned` exist for this pair without a later `ScoutUnassigned`), not a persisted enum.

Free Agents receive no special-case treatment — they are scoutable exactly like contracted players,
with no wrinkle in the assignment or Progress model.

Transfer/exit interactions:
- Target Player transfers into the human's own club: the Scouting Assignment/Progress record is
  discarded — own-squad players never carry Scouting Progress at all (they're immediately full-info
  per the existing own-squad rule).
- Target Player transfers to a different (non-human) club: Progress persists unchanged. The manager
  was learning about the player, not the contract; a new employer doesn't erase prior observation.
- Target Player leaves the game entirely: not applicable — v1 has no retirement mechanic.

## Alternatives considered

- **Stacking multiple Scouts on one Player** for faster Progress: rejected — it adds a
  spend-more-to-learn-faster lever this milestone doesn't need to earn its scope, and complicates the
  resource model (N Scouts would no longer equal N assignment slots 1:1).
- **Implicit auto-swap on `AssignScout`** when all slots are full: rejected — silently pausing a
  different assignment the manager didn't explicitly touch is a surprising side effect; explicit
  two-step (`UnassignScout` then `AssignScout`) keeps command effects legible, consistent with
  `SetTrainingFocus` not auto-clearing anything either.
- **A persisted "paused" status** distinct from "currently assigned": rejected — Progress-value plus
  a derived assigned/unassigned fact is sufficient; a third status adds a state with no distinct
  observable behavior.

## Acceptance criteria

- A human club's Scout count is a table lookup on Stature Tier, computed once at Season start.
- `AssignScout`/`UnassignScout` enforce the 1:1, N-slot cap; `AssignScout` on a full club fails
  without side effects.
- Scouting Progress for a Player only advances while a Scout is actively assigned to them, and never
  resets on unassignment/reassignment.
- Free Agents flow through the same assignment/Progress logic with no special-cased branches.
- A Player joining the human's own squad has no residual Scouting Progress record.

## Risks

- Fixed 1:1, no-stacking model means a manager can never "rush" scouting a single high-priority
  target beyond the standard accrual rate (ticket 02) — accepted as a deliberate scope cut, not an
  oversight; could return as a follow-on lever later.
- Discarding Scouting Progress on the target joining the human's own club is irreversible; if a
  future feature ever wanted to show "how well did our pre-signing scouting estimate track reality,"
  that data is gone. Not needed by anything currently planned.
