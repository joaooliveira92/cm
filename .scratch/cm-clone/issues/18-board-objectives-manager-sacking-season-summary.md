# 18: Board objectives, manager sacking & season summary screen

**What to build:** A per-club Board Objective (a League-position band derived from Stature Tier) is
set for the player's club each season. At season end, `SeasonConcluded` triggers
`BoardObjectiveJudged` with a Verdict (Exceeded/Met/Missed) for the player's club only. A
Consecutive-Miss Counter drives `ManagerWarned` at one miss and `ManagerSacked` at two in a row,
archiving the save as read-only and returning the player to the "continue career" list. A Season
summary screen presents the Verdict and standings.

**Blocked by:** 15

**Status:** ready-for-agent

- [ ] Board Objective band is derived from the player's club's Stature Tier via a fixed
      `packages/shared` tier→band table, set at season start
- [ ] Only the player's club receives a Board Objective and is judged; AI clubs are never judged
- [ ] `SeasonConcluded` fires once the final Matchday's fixtures all resolve, carrying the final
      League Table
- [ ] `BoardObjectiveJudged` fires immediately after, comparing final position to the band and
      recording Exceeded/Met/Missed
- [ ] Consecutive-Miss Counter increments on Missed, resets to zero on Exceeded/Met
- [ ] Counter 0→1 fires `ManagerWarned` (no mechanical effect, visible in the summary)
- [ ] Counter 1→2 fires `ManagerSacked`: the save is archived (read-only, no further commands
      accepted) and the player returns to the "continue career" list with no re-hire flow
- [ ] Season summary screen shows the final League Table position, the Verdict, and (if applicable)
      the warning/sacking outcome
- [ ] A save with no `ManagerSacked` event continues indefinitely into the next season on
      `AdvanceCalendar`
- [ ] Cross-Decider reactions (`SeasonConcluded` → judgment across up to 20 Club streams) run as an
      in-process synchronous reactor within the same request, no outbox
