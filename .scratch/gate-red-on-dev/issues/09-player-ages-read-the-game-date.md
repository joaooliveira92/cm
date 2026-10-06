# 09: Player ages read the game date, not the wall clock

Split from the review of [07](07-youth-intake-at-rollover.md), 2026-09-22, orchestrator.

**What to fix:** the main process computes a player's age from the real date in four places
(`transfers/economics.ts`, `club/squad.ts`, `club/development.ts`, `career/player.ts`). So in-game ages never
advance with the Seasons, Player Development and wages depend on when the game is run (the same seed can
give a different result next year), and a Youth Intake player shows as 15 or younger on the Squad screen
from season 2 on. For wall-clock ages under 16, `attributeCeilingOn20Scale` clamps growth, so intake players
do not develop, against the note's "young and raw" premise. Add one pure `ageOn(dateOfBirth, isoDate)` in
`@cm-clone/shared` (07 has a local copy in `season/youthIntake.ts` and its test) and feed every caller the
Season's game date.

**Blocked by:** None

**Status:** resolved

- [x] No main-process age helper reads the wall clock; every age is computed on the game date
- [x] A seeded development and wage result is the same whatever the machine's date, shown by a test that fakes two different system dates
- [x] A Youth Intake player shows as 16–18 on the Squad screen on the date they join (amended 2026-09-22: one born in January–May of the earlier year turns 19 before the Season ends; the note's "16 to 18" is at the rollover)
- [x] Seeds that move are re-pinned with the cause stated; `pnpm check:all` green

## Answer

Resolved 2026-09-22. One pure `ageOn(dateOfBirth, date)` in `packages/shared/src/season/calendar.ts` (ISO
parts, no `Date`, no timezone) replaces the four wall-clock helpers and 07's local copies. Every caller gets
the Calendar's date: the Squad and Player reads through `loadGameDate`; Player Development the date the
Season concluded on; pricing, signing, renewal and the AI windows the date of their own moment, passed in;
the opening economy the Season 1 start date. A seeded world played under two faked system dates (2019 and
2043) now gives identical wages, ages, values and development. No pinned number moved, because every
expected value is computed through the same helpers.

A new `effect-lint` rule, `no-wall-clock`, bans zero-argument `new Date()` and `Date.now()` in
`apps/desktop/src/main/{club,career,transfers,season,match}` and the two pure packages; `match/` added by the
orchestrator from review. `world/` (save timestamps) and `rpc/` (durations) rightly keep the real clock.

Review: APPROVE. Criterion 3 amended: an intake player shows as 16–18 on the date they join, which is the
note's "at the rollover"; one born early in the earlier year turns 19 before the Season ends. Visible
consequence: ages now advance with the Seasons in existing saves, so their future development and prices
change. Left (lows): the before-any-Season branch of `loadGameDate` has no direct test; the rule does not
catch a bare `Date()` call.
Report: [gate-red-on-dev-ticket-09](../../../.ai/reports/gate-red-on-dev-ticket-09.md).
