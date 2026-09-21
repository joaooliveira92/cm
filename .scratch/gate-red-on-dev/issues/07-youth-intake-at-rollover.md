# 07: A Youth Intake at every Season rollover

**What to build:** at each Season rollover, after contract expiry, every club gains generated players
aged 16–18 through world generation's player draw: two to four per club, plus as many more as it takes
to reach a squad of 16. Seeded from the world seed and the Season. Each intake player signs an ordinary
Contract through the existing signing path. The human club's intake is a News Inbox item naming the
players.

**Decision:** [a Youth Intake is the squad floor](../../../.agents/notes/proposed/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md),
answering [decision request 01](../decision-request-01-squad-decay-has-no-floor.md).

**Files:** the rollover transaction (`apps/desktop/src/main/season/`), world generation's player draw
(`apps/desktop/src/main/world/`), the News Inbox writer; tests beside `contract-expiry.test.ts`.

**Blocked by:** 

**Status:** ready-for-agent

- [ ] Every club, the human's included, gains two to four players aged 16–18 at each rollover, after
      expiry, inside the rollover's one transaction
- [ ] A club still below 16 after that gains as many more as it takes to reach 16
- [ ] The same world seed produces the same intake, proved by generating a world twice
- [ ] Seeds 7, 46, 298 and 381 played through three rollovers leave every club with at least 16
      players, and the human club can always field eleven
- [ ] The human club's intake appears in the News Inbox, one item naming the players
- [ ] No schema change (new rows only); `pnpm check:all` green
