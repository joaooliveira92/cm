# 27: The live-match header readout is hardcoded to 0-0 at minute 0

**What to fix:** `MatchProvider.tsx` publishes the live-match header readout through `setScopeState`
with `homeScore: 0, awayScore: 0, currentMinute: 0`, whatever has happened in the match. Feed it from
the revealed score and minute the session records (`getRevealedScore`, `getRevealedMinute`, ticket
22), and update it as lines are revealed.

Found in review of [ticket 23](23-match-day-remount-replays-from-kickoff.md).

**Blocked by:** None

**Status:** resolved

- [x] The header readout shows the revealed score and minute during a live match and after returning to Match day
- [x] A test pins it

## Answer

Resolved 2026-09-17. `CommentaryProvider` now publishes the live-match readout to scope state from the
revealed `homeScore`, `awayScore` and `currentMinute` it already holds and restores on a remount.
`MatchProvider`'s publish with hardcoded zeros is gone. The two providers are only ever mounted
together, in `MatchDayScreen`, so presence semantics are unchanged: `match` is set while the match
is in play and cleared on completion or unmount, and Continue is suspended exactly as before.

Test: `remount-continues-reveal.test.tsx` "publishes the revealed score and minute to the header
readout, and restores them on return". It reads `12' · Home FC 0–0 Away FC`, then
`30' · Home FC 1–0 Away FC`, and the same after a remount with reads held. It failed first, reading
`0'`.

Away from Match day the header has no match readout, as before. `scopeState.ts` says only the mounted
screen writes scope state. Whether the readout, and Continue's suspension, should persist across
career screens during a live match was not specified. Raise it if wanted.
