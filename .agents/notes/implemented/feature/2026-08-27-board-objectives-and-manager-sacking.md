# Agent Note: Board Objective derives from Stature Tier as a sibling of Budget, not a driver of it

Status: implemented

> Migrated from ADR-0006 when the numbered ADR layer was retired.

## Problem

The obvious CM-style design has the board *set* a target that also *constrains* the transfer kitty —
"we expect a top-half finish, so here's a bigger budget." That couples two mechanics that could equally
well be independent, and the coupling has to be ruled on before either is built.

Sacking raises a second question with three plausible shapes: instant on one missed objective,
cumulative across a career, or consecutive with a reset.

## Decision

### Board Objective is a sibling of Budget, not downstream of it

Transfer Budget and Wage Budget are already fixed, formula-driven outputs of a club's Stature Tier — see
[the formula-driven transfer economy](../architecture/2026-08-27-formula-driven-transfer-economy.md).
Board Objective is a second, independent output of that same Stature Tier. Neither derives from the
other.

This keeps both mechanics pure functions of one fixed input, with no feedback loop between "how well did
the team do" and "how much can it spend" — a loop that would need its own tuning and would make budgets
no longer purely stature-driven.

Stature Tier itself stays permanently fixed for a club's whole career in v1. A club moving tiers after
sustained over- or under-performance is a natural extension, but it is a second new mechanic — magnitude,
caps, interaction with Budget — layered on top; deferred rather than decided.

### Consecutive-miss ladder, not instant or cumulative sacking

A single bad season (one `Missed` Verdict) only warns. Sacking needs two `Missed` Verdicts in a row, and
any `Exceeded` or `Met` season resets the counter to zero.

Instant sacking on one miss makes a long career fragile to a single bad-luck Season. A cumulative-forever
counter — any second miss, ever — has the same problem over a long enough career. Consecutive-with-reset
is the standard genre convention and the only one of the three that does not get harsher the longer a
save runs.

### Sacking ends the save

`ManagerSacked` archives the save as read-only, accepting no further commands, and returns the player to
the continue-career list. A flow where a sacked manager gets hired by another club was considered and
rejected: it would need club selection and reputation carry-over, neither of which exists anywhere else
in scope, for a v1 whose destination is a single save at a time.

### No explicit win state

A career is open-ended; `ManagerSacked` is the only thing that ends one. Adding a win trigger — "win the
league N times" — would need a second end-state with its own consequences to design, symmetric to
sacking, for no clear v1 need. The games this clone is modeled on do not have one either.

## Alternatives considered

- **Board Objective sets the budget.** Rejected: creates a performance→budget feedback loop needing its
  own tuning, and breaks the property that both are pure functions of Stature Tier.
- **Stature Tier moves with performance.** Deferred, not rejected: a genuine extension, but a separate
  mechanic with its own magnitude and cap questions.
- **Instant sacking on one missed objective.** Rejected: one unlucky season ends a long career.
- **Cumulative miss counter with no reset.** Rejected: sacking probability rises with career length
  regardless of recent form.
- **Re-hire elsewhere after sacking.** Rejected for v1: needs club selection and reputation carry-over
  that exist nowhere else.
- **An explicit win state.** Rejected: needs a second designed end-state for no clear need.

## Consequences

- `assertSaveNotSacked` must guard every mutating command handler; a sacked save is terminal.
- Budgets never respond to results, which is a deliberate flatness.
- Two bad seasons in a row is the only way to lose, and one good season always buys a clean slate.
