# 02: Does the existing deferred decision on Group N still hold?

Type: task
Status: resolved

Blocked by: 01

## Question

The existing [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md)
rules Group N (Screens 194–207) as **deferred, unscheduled**, with sacking staying terminal. Does
this decision still hold?

[Ticket 01](01-screen-inventory.md) confirmed all 14 screens are absent from the shipped renderer,
RPC layer, schema, and domain logic. CONTEXT.md explicitly states:
- "There is no job market: a sacked manager does not seek another post, and that is deferred rather
  than ruled out" (810-812)
- "Resignation (leaving a club for the job market, which this game has no referent for)" is an
  _Avoid_ term (821)
- "Manager Sacked" archives the save — there is no "seek another post" path (810-813)

Since the Agent Note was written (2026-09-13), no new implementation has landed that touches this
group. All 14 screens remain absent.

## Answer

**The deferred decision holds.** All 14 screens are absent, no new infrastructure supports them,
and CONTEXT.md already rules the job market out of scope. The existing Agent Note remains accurate
and needs no update.

This is a confirmation of an existing decision against evidence that it still holds — no new Agent
Note is warranted. The deviation register in [spec.md](../spec.md) records this per screen.

**What would reopen it.** A human deciding the game wants a multi-club career path. Reopening would
require at minimum: vacancies for AI clubs, an application/interview/offer flow, an unemployed state
in place of archiving, rebinding a Save to a new club, and a reputation model. The existing note
recommends waiting until Group K (board) and Group Q (season transitions) are reconciled before
reopening.