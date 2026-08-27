# Board Objective derives from Stature Tier as a sibling of Budget, not a driver of it

The obvious CM-style design has the board *set* a target that also *constrains* the transfer kitty —
"we expect a top-half finish, so here's a bigger budget." We reject that coupling: Transfer Budget and
Wage Budget (ADR-0005) are already fixed, formula-driven outputs of a club's Stature Tier, and Board
Objective is now a second, independent output of that same Stature Tier. Neither derives from the
other. This keeps both mechanics pure functions of one fixed input, with no feedback loop between
"how well did the team do" and "how much can it spend" — a loop that would need its own tuning and
would make budgets no longer purely stature-driven, undoing ADR-0005's "not board-set" position.

Stature Tier itself stays permanently fixed for a club's whole career in v1. A club moving tiers after
sustained over/under-performance is a natural extension, but it's a second new mechanic (magnitude,
caps, interaction with Budget) layered on top of this ticket's scope; deferred rather than decided.

**Consecutive-miss ladder, not instant or cumulative sacking.** A single bad season (one `Missed`
Verdict) only warns; sacking needs two `Missed` Verdicts in a row, and any `Exceeded` or `Met` season
resets the counter to zero. Instant sacking on one miss makes a long career fragile to a single
bad-luck Season; a cumulative-forever counter (any second miss, ever) has the same problem over a long
enough career. Consecutive-with-reset is the standard genre convention and the only one of the three
that doesn't get harsher the longer a save runs.

**Sacking ends the save; there is no re-hire-elsewhere flow.** `ManagerSacked` archives the save
(read-only, no further commands) and returns the player to the "continue career" list. A flow where a
sacked manager gets hired by another club was considered and rejected: it would need club selection and
reputation carry-over, neither of which exists anywhere else in scope, for a v1 whose destination is a
single save at a time.

**No explicit win state.** A career is open-ended; `ManagerSacked` is the only thing that ends one.
Adding a win trigger (e.g. "win the league N times") would need a second end-state with its own
consequences to design, symmetric to sacking, for no clear v1 need — the games this clone is modeled on
don't have one either.
