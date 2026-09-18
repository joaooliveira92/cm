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

**Status:** resolved

## Answer

**None of the deferred controls enter v1 now. Screen 164 (Competition Results) is next, then 161
(Competition Overview).** Decided by the human on 2026-09-18.

Reasoning, so this is not re-litigated:

- **Filters, round/stage navigation, calendar-period navigation, export** — all deferred. Each drags
  in data the game does not model. Venues do not exist. Stage membership does not exist as a
  distinct identifier. Historical editions bound to their original rules do not exist. Export has no
  consumer. Building the control before the data is building a control over nothing.
- **Historical editions, partial-coverage and permission-limited view states** — deferred for the
  same reason. Coverage tiers are a real concept in the imported spec; this game has Simulation
  Depth, which is not the same thing, and conflating them would put a second name on one idea.
- **Screen 164 is next** because it is the closest sibling of 163 and reuses the same read: a
  Competition's Fixtures, filtered to those already played, with scores. It should reuse
  `getCompetitionFixtures` rather than adding a third fixture read — the `played` flag already
  distinguishes them, so this is a renderer-side concern plus whatever ordering Results wants
  (most recent first, against Fixtures' calendar order).
- **Screen 161 after it**, as the overview that links the two.

This closes out the "deferred, not dropped" note on ticket 04: the deferral is now a decision with a
reason, not an open question.

Follow-on tickets are not filed here — 164 and 161 need their own tickets when someone picks up the
effort, and filing them now would be pre-slicing work nobody has scheduled.
