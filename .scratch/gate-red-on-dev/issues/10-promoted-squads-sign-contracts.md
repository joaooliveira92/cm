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

**Status:** resolved

- [x] Every player in a promoted club's generated squad has a Contract that expires like any other
- [x] Promoted-squad ids cannot collide through a shared 32-bit base
- [x] `pnpm check:all` green

## Answer

Resolved 2026-09-22. A squad conjured for a club promoted out of a results-only division now signs Contracts
through `signGeneratedSquad` (`apps/desktop/src/main/season/signGeneratedSquad.ts`), the one rollover path the
Youth Intake also uses: the formula wage at the player's age on the Season's opening date, and one to three
years like a world-generation squad, each length from its own full-path seed. The players expire and count
against the Wage Budget like everyone else's, and the Youth Intake still refills the club to 16 afterwards.
Promoted ids now derive from the full path (`promotedPlayerId`), pinned by a test on the same colliding club
seeds as 07; world generation's ids are unchanged. No seeded test moved.

The simulation-depth note gains one sentence on the Contracts. Found while building it:
[11](11-conjured-squads-are-age-correct.md), conjured squads are aged as if every Season were Season 1.
Reviewed inline by the orchestrator.
Report: [gate-red-on-dev-ticket-10](../../../.ai/reports/gate-red-on-dev-ticket-10.md).
