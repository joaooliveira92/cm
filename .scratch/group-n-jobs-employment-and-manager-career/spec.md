# Spec: Group N — Jobs, Employment and Manager Career

Status: resolved — no implementation work follows from this spec.

## Summary

**Group N is deferred, unscheduled.** All fourteen screens (194–207) are excluded from v1. This
document is the deviation register the map set out to produce; it is not a build spec, because
there is nothing to build.

The decision is [ticket 02](issues/02-v1-scope.md); the evidence is
[ticket 01](issues/01-screen-inventory.md).

## Why

An existing [Agent Note](../../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md)
already ruled this group deferred before the spec was imported. CONTEXT.md — binding for domain
language per ENGINEERING-CONTRACT — confirms the ruling:

> There is no job market: a sacked manager does not seek another post, and that is deferred rather
> than ruled out.
> — CONTEXT.md:811-812 (**Manager Sacked**)

> _Avoid_: Resignation (leaving a club for the job market, which this game has no referent for)
> — CONTEXT.md:821 (**Manager Retired**)

The game has a single-club career: a sacked or retired manager's career ends (the save is archived).
There is no "seek another post" path, no reputation model, no qualifications model, no employment
history beyond what Manager History (Screen 30) captures — none of the infrastructure Screens 194–207
would build on.

Ticket 01 confirmed the supporting model is absent across all layers: no routes, no RPCs, no DB
tables, no components, no shared domain models for any of the 14 screens.

## Deviation register

Every screen carries the same deviation, for the same reason, so the register is stated once rather
than repeated fourteen times.

| Screens | Deviation | Reason |
|---|---|---|
| 194–207 | **Deferred, unscheduled** — not built, not routed, not stubbed | The game has no job market; CONTEXT.md:811-812 rules it deferred. Per [Agent Note](../../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md): sacking stays terminal until Group K and Group Q are reconciled. |

Per-screen notes where the imported spec asserts something that contradicts this game specifically:

| Screen | Contradiction with the shipped game |
|---|---|
| 194, 195 Job Centre / Available Jobs | Assume a multi-club career with vacancy listings. The game has one club per career — no vacancy exists to list. |
| 196, 197 Job Advertisement / Application | Assume managers can view and apply for vacancies. No application flow exists; Save has no "unemployed" state. |
| 198, 199, 200, 201 Interview / Offer / Contract / Appointment | Assume a hiring workflow with interviews, offers, and negotiations. None of this infrastructure exists. |
| 202 Resign | CONTEXT.md:821 lists Resignation as an _Avoid_ term: "leaving a club for the job market, which this game has no referent for." Manager Retired is the shipped terminal-equivalent. |
| 203 Dismissal | The existing **Manager Sacked** event (CONTEXT.md:809-813) archives the save. This screen is the nearest to a shipped counterpart — a dedicated dismissal surface could derive from the existing event, but no such screen exists. |
| 204 Job Security | The existing **Consecutive-Miss Counter** (CONTEXT.md:791-793) and **Manager Warned** event (805-807) model job security implicitly. A dedicated surface does not exist. |
| 205 Reputation / Career Progression | No manager reputation model exists. The Manager Pillars (CONTEXT.md:694-710) are immutable creation-time values, not dynamic progression. |
| 206 Coaching Badges / Qualifications | No qualifications model exists. Manager Pillars are the shipped substitute for manager capability — no badge or earned-progression system exists. |
| 207 Employment History / Milestones | Partially overlaps **Manager History** (Screen 30). No dedicated milestones surface exists. |

## What would reverse this

A human deciding the game wants a multi-club career path. That would need at minimum: vacancies for
AI clubs, an application/interview/offer flow, an unemployed state in place of archiving, rebinding
a Save to a new club, and a reputation model. The Agent Note recommends waiting until Group K
(board) and Group Q (season transitions) are reconciled before reopening.