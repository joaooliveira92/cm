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

**Status:** ready-for-agent

- [ ] Score, on-pitch count, injuries and Condition in a match response reflect only revealed events
- [ ] The live Commentary screen shows no line or result beyond Match day's revealed position
- [ ] Tests pin each with a seed where the state changes after the revealed position
