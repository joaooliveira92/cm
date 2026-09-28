# 01: The human club recovers Condition before each of its own kickoffs

**Status:** claimed

**Type:** bug

**Blocked by:** None (can start immediately).

Ruled by the human on 2026-09-28: fix this as its own ticket, and block
[training-schedule-and-delegation 04](../../training-schedule-and-delegation/issues/04-schedule-moves-condition.md)
on it, so 04 multiplies a recovery step that exists.

## What's wrong

Between Fixtures every squad should regain part of the gap back to 100 Condition, keyed to Natural
Fitness and the most recent injury's Severity (`CONTEXT.md`, Condition; the fitness ledger of
ticket 10). The step, `recoverClubFitness`, only runs inside `resolveFixtureScore`, the path that
simulates a match. The human's own Fixtures never take that path:

- the Calendar stops at the Pre-match Boundary without resolving the human's Fixture;
- the live match reads each player's stored Condition as its starting Condition;
- `commitMatchday` writes the full-time Condition back to the ledger.

Nothing raises it in between. A probe on a fresh career (2026-09-28) played one live Matchday: 11
human players ended between about 84 and 88, and at the next Pre-match Boundary all 11 were
unchanged. Only the next Season's start resets the ledger to 100.

## Expected

Both clubs of the human's Fixture get the recovery step a simulated Fixture gives its two clubs,
exactly once, before kickoff. The opponent has the same gap as the human club: a live match reads
its stored Condition too, so it has never recovered before playing the human either.

- **Where:** when the Calendar stops at the Pre-match Boundary for the human's Fixture, in the same
  transaction that records the boundary. Not in `startMatch`: a match can be retried after a lost
  response, and recovery must not apply twice.
- **Replay:** the live match's `MatchStarted` event records each player's starting Condition, so
  recovering before the start is recorded keeps every replay identical.
- **Once per Fixture:** stopping at the same boundary again (an advance retried, a save reloaded
  while the boundary is pending) applies nothing a second time.
- **Every other Fixture:** unchanged. Simulated Fixtures still recover their two clubs inside
  `resolveFixtureScore`.

## Consequences

- Existing careers change: both squads in the human's Fixture arrive at kickoff fresher than before. This is the intended
  behaviour, ruled on 2026-09-28.
- The Workload screen, the Squad screen's "Tired" status and the Assistant Manager's Best Practice
  rule read the same ledger, so all of them see recovered values from the fix on.
- training-schedule-and-delegation 04's "a career with no schedule plays exactly as before" means as
  after this fix.

## Acceptance criteria

- [ ] After a live Matchday, the human squad's Condition at the next Pre-match Boundary is higher
      than at the previous full time for every player below 100, by the same step AI clubs get.
- [ ] A player with a severe injury recovers less than one with a knock, as for AI clubs.
- [ ] Stopping at the same boundary twice recovers once.
- [ ] The live match starts from the recovered Condition, and replaying it gives the same result.
- [ ] The opponent in the live match is recovered the same way, once.
- [ ] Clubs not in the human's Fixture have the same Condition after an advance as before the fix.
- [ ] `CONTEXT.md`'s Condition entry says both the human and AI clubs recover before each Fixture.
