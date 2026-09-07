# 06 — Screen 30: does a Save accumulate a career record?

Type: grilling

Blocked by: 03

## Question

[30_manager_history.md](../../../docs/specs/group_b_global_navigation_and_inbox/30_manager_history.md)
asks for a chronological record of appointments, resignations, dismissals, retirements, honours,
awards, and milestones. Taken literally it does not apply: this game has **one club per Save**, and
resignation and the job market are Group A rulings pushed out to Group N. The timeline the import
describes has exactly one appointment on it.

But dismissing the screen on that basis would dismiss a real question with it. The question underneath,
and the one this ticket resolves:

**Does a Save accumulate a season-by-season record — final league positions, honours, tenure length,
the sacking or retirement that ended it — that outlives the current season? And if so, is that a
screen, or a section of Manager Profile?**

Facts to establish before deciding: what Season Summary already persists and shows, whether anything
survives a season rollover in queryable form, and what `manager_status` and the archive path retain.
It is entirely possible the data already exists and only the surface is missing — or that Season
Summary already *is* this screen for the only season that has one.

Blocked on ticket 03 so that "or a section of Manager Profile" is a decision against a profile whose
contents are known rather than assumed.

If the answer is that a career record exists and wants a surface, that is a design decision worth an
Agent Note. If the answer is that Season Summary already covers it, screen 30 is disposed of by that
row and the ticket says so.

No code changes.

## Done when

- The career-record question has a stated answer: what accumulates, where it lives, and what surfaces it.
- Screen 30 moves off `Not yet audited`, classified against that answer.
- If a new surface is warranted, its navigation placement is handed to the map's fog, not decided here.
