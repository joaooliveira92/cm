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

**Status:** ready-for-agent

- [ ] No main-process age helper reads the wall clock; every age is computed on the game date
- [ ] A seeded development and wage result is the same whatever the machine's date, shown by a test that fakes two different system dates
- [ ] A Youth Intake player shows as 16–18 on the Squad screen in their first Season
- [ ] Seeds that move are re-pinned with the cause stated; `pnpm check:all` green
