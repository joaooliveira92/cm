# The human Fixture's pre-match boundary

Cut out of the Screen 23 breakdown (`.scratch/continue-and-advance-time/`) because it is a separate
piece of work: three tickets of the most consequential transaction in the game, not a surface change
beside the Continue result.

The design is already recorded, in full, and is still `proposed`:
[The human Fixture's pre-match boundary](../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
These tickets implement it. They do not re-open it — every question it settles (why the whole
Matchday is held rather than nine Fixtures resolved eagerly, why the seed is derived rather than
drawn, why completion is an explicit command rather than a side effect of polling) is answered
there, with the alternatives it rejected.

## Why it matters

Screen 23's first acceptance criterion is that mandatory decisions cannot be skipped. Today Continue
simulates the human club's League Fixture headlessly and returns a count; the Match day screen is a
separate exhibition against a club of the player's choosing that never writes back to a Fixture; and
the readiness check is advisory everywhere, gating nothing. A career's most important moment is a
number produced by a button.

## Sequence

The three tickets are strictly ordered, and the order is the risk order: stop the calendar first,
bind the match to the Fixture second, commit the Matchday last. Each is sized to one session.
