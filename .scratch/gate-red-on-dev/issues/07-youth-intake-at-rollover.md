# 07: A Youth Intake at every Season rollover

**What to build:** at each Season rollover, after contract expiry, every club gains generated players
aged 16–18 through world generation's player draw: two to four per club, plus as many more as it takes
to reach a squad of 16. Seeded from the world seed and the Season. Each intake player gets an ordinary
Contract on the signing terms, written directly (amended 2026-09-22; see the note). The human club's intake is a News Inbox item naming the
players.

**Decision:** [a Youth Intake is the squad floor](../../../.agents/notes/proposed/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md),
answering [decision request 01](../decision-request-01-squad-decay-has-no-floor.md).

**Files:** the rollover transaction (`apps/desktop/src/main/season/`), world generation's player draw
(`apps/desktop/src/main/world/`), the News Inbox writer; tests beside `contract-expiry.test.ts`.

**Blocked by:** 

**Status:** resolved

- [x] Every club, the human's included, gains two to four players aged 16–18 at each rollover, after
      expiry, inside the rollover's one transaction
- [x] A club still below 16 after that gains as many more as it takes to reach 16
- [x] The same world seed produces the same intake, proved by generating a world twice
- [x] Seeds 7, 46, 298 and 381 played through three rollovers leave every club with at least 16
      players, and the human club can always field eleven
- [x] The human club's intake appears in the News Inbox, one item naming the players
- [x] No schema change (new rows only); `pnpm check:all` green

## Answer

Resolved 2026-09-22. `grantYouthIntake` (`apps/desktop/src/main/season/youthIntake.ts`) runs in
`rolloverToNextSeason`, after contract expiry and inside the advance or commit transaction. Every club in
a squad competition next Season gains `max(2 + r·3, 16 − squad)` players from `generateYouthIntake` in
`@cm-clone/shared`, which reuses `generatePlayer` with ages 17–18 in the joining year (16–18 on every
date of that year). Each gets a Contract on the signing terms, written directly; see the amended note.
The human club gets one `YouthIntakeJoined` News Inbox item naming the players.

Review: NEEDS_REWORK, then repaired. **High:** intake player ids were derived from a 32-bit intermediate
seed, so two equal bases would regenerate the same ids on every retry of Continue and brick the save on
the primary key; the rework found a real colliding pair (club seeds 59599 and 813120 in Season 2). Ids now
derive from the full path (`youthIntakePlayerId`), and world generation's ids are unchanged, pinned by a
test. Medium: the note said "through the existing signing path"; amended to describe the direct write and
why. A club with two squad-competition rows now gets one intake.

The seed sweep (7, 46, 298, 381, three rollovers, about 20 s) widens the Board Objective to keep the job,
because a sacked career never rolls over; seed 381 is sacked after season 2 otherwise.

Split out: [09](09-player-ages-read-the-game-date.md) (ages read the wall clock, high) and
[10](10-promoted-squads-sign-contracts.md) (promoted squads sign no Contracts). Left (lows): the intake does
not fill positional gaps (a club can stay keeperless; a domain question); no direct test that a promoted
club gets an intake; `HumanClubCannotFieldElevenError`'s naming path is now untested.
Report: [gate-red-on-dev-ticket-07](../../../.ai/reports/gate-red-on-dev-ticket-07.md).
