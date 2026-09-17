# 27: The live-match header readout is hardcoded to 0-0 at minute 0

**What to fix:** `MatchProvider.tsx` publishes the live-match header readout through `setScopeState`
with `homeScore: 0, awayScore: 0, currentMinute: 0`, whatever has happened in the match. Feed it from
the revealed score and minute the session records (`getRevealedScore`, `getRevealedMinute`, ticket
22), and update it as lines are revealed.

Found in review of [ticket 23](23-match-day-remount-replays-from-kickoff.md).

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The header readout shows the revealed score and minute during a live match and after returning to Match day
- [ ] A test pins it
