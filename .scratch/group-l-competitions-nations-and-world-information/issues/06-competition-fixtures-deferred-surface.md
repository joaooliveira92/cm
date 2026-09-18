# 06: Which of the Competition Fixtures controls belong in v1?

Split out of [05](05-competition-read-followups.md) item 3, which shipped its other two items. This
is a scope question, not a build step — it is labelled `needs-info` so the frontier scan does not
pick it up as work.

## Question

Ticket 04 shipped a flat list of the current Season's Fixtures. The imported spec
[163](../163_competition_fixtures.md) additionally describes:

- filters by date, round, stage, club, venue and status
- round and stage navigation
- calendar-period navigation
- export of a fixture list
- historical editions, partial-coverage and permission-limited view states

None of that was built, and none of it should be until someone decides it is wanted. The imported
specs are maximalist by construction — they describe a finished commercial product, not this v1.
[02 — v1 scope](02-v1-scope.md) already cut Group L down to screens 161–164 on exactly that reasoning.

## Why a human

Building any of these is cheap individually and expensive in aggregate, and each one drags in data
the game does not model yet (venues, broadcast context, stage membership, historical editions bound
to their original rules). An agent picking them off one at a time would grow the surface without
anyone deciding the game wants it — the failure mode [02](02-v1-scope.md) was written to prevent.

## What is already settled

- [02 — v1 scope](02-v1-scope.md): screens 162–164 and 161 are v1; 176–180 are out; the remaining 11
  are deferred pending data models.
- Ticket 04 shipped 163 as a current-Season list, deliberately.
- Round is the correct term for a round number; **Matchday** is an _Avoid_ (CONTEXT.md:438-442).

## Also outstanding in this effort

Screens 164 (Competition Results) and 161 (Competition Overview) are v1 scope per ticket 02 and have
no ticket. Whoever answers this should say whether they are next, since 164 is the closer sibling of
163 and would reuse the same read.

**Blocked by:** None

**Status:** needs-info
