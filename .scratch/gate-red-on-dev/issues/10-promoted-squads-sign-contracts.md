# 10: A squad generated for a promoted club signs Contracts

Split from the review of [07](07-youth-intake-at-rollover.md), 2026-09-22, orchestrator.

**What to fix:** `reconcileSquadsWithDepth` (`apps/desktop/src/main/season/rollover.ts`) generates a squad for
a club promoted out of a results-only division but writes no Contract rows (`initializeSeasonEconomy` runs
only at world creation). Those players never expire and never count against a Wage Budget, so such AI
squads carry permanent players on top of every Youth Intake. Give them Contracts on the same terms 07's
intake uses. The same path derives player ids from a 32-bit base (`deriveId(baseSeed, "player", i)`), the
weakness 07 fixed for intake ids; derive them from the full path too, if that does not move existing seeded
worlds (world generation's own ids must stay as they are).

**Blocked by:** None

**Status:** ready-for-agent

- [ ] Every player in a promoted club's generated squad has a Contract that expires like any other
- [ ] Promoted-squad ids cannot collide through a shared 32-bit base
- [ ] `pnpm check:all` green
