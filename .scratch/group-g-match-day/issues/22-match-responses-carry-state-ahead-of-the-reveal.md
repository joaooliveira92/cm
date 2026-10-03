# 22: Match responses carry score, head-count, injuries and Condition ahead of the reveal

**What to fix:** [ticket 18](18-substitution-count-reads-the-whole-match.md) cut substitution counts
at `revealedEvents`. The rest of `buildResumeSimulationView` (`apps/desktop/src/main/match/view.ts`)
still reports future state:

- **Score.** `applyPollView` sets the scoreboard from the end of the fetched chunk, and
  `recordRevealedScore` passes it to the standalone screens. A goal can show up to about 40 lines
  before its Commentary Line.
- **On-pitch count.** It is taken from the chunk's last event, so "playing with 10" can be early.
- **Injuries.** `injuries` and `injuredClubIds` are per chunk, ahead of the reveal.
- **Condition.** `conditions` are always full-time values.
- **Commentary screen.** `MatchCommentaryScreen` polls with its own cursor, no pacing and
  `revealedEvents: null`, so the whole match, including the result, appears within seconds.

Cut each of these at `revealedEvents` the way the counts are cut. Pace the Commentary screen by the
shared revealed position, or cut it there.

Found in the review of ticket 18.

**Blocked by:** None

**Status:** resolved

- [x] Score, on-pitch count, injuries and Condition in a match response reflect only revealed events
- [x] The live Commentary screen shows no line or result beyond Match day's revealed position
- [x] Tests pin each with a seed where the state changes after the revealed position

## Answer

Resolved 2026-09-16.

- **Score.** `scoreAsOf(events, revealedEvents)` in `view.ts` cuts the score at the revealed
  position. The renderer applies score, head-count, pitch and `recordRevealedScore` together in
  `applyRevealedState`, under ticket 19's send-order guard. It re-reads when a Goal, RedCard, Injury,
  Substitution or FullTimeWhistle line is revealed. A goal reaches the scoreboard one local round
  trip after its line and never before it.
- **Head-count.** `homeOnPitchCount`/`awayOnPitchCount` are the size of the ticket 19 pitch, so the
  count and the pickers agree. They match the engine over seeds 1–400 with no commands. After a live
  `ChangeTactics` they follow the fold rather than the engine's rebuilt eleven, so a "Playing with 10"
  alert now stays after a tactics change. That is recorded as evidence on
  [decision request 01](../decision-request-01-live-change-tactics-scope.md).
- **Injuries.** They stay per chunk and are paired with that chunk's Injury lines. The renderer acts
  on one only when its line is revealed (ticket 21), so nothing leaks ahead.
- **Condition.** `conditions` was removed from `ResumeSimulationView`. The engine has only full-time
  values and nothing read them. Full-time Condition is still persisted by `recordMatchdayConditions`.
- **Commentary screen.** `MatchCommentaryScreen` sends the real `revealedEvents` and renders up to
  it: the revealed position during a live match, the whole match if this renderer watched it reach
  full time, and nothing otherwise. After a restart that means an empty feed until ticket 23 restores
  the position.

**Tests.**

- `test/main/match/revealed-state.test.ts`, seed 550, with each property re-verified in the test:
  Goal at line 1, HalfTimeReached at 8, human RedCard at 9.
- `streaming-integration.test.tsx`: the scoreboard stays level until the Goal line; the head-count
  drops at the RedCard line.
- `test/renderer/matchCommentary/match-commentary-screen.test.tsx`: live, watched to full time,
  never watched.

**Review.** APPROVE.

- M1: the head-count after `ChangeTactics` went to decision request 01.
- L1: FullTimeWhistle now re-reads the score.
- L3: a stale test comment was fixed.
- L2: the empty-feed copy after a restart is left for ticket 23.
- L4: the fixture's impossible score is accepted.
