# 16: Live commands and the halftime toggle trust the revealed minute

**What to build:** Ticket 07 stamps a live `submitMatchCommand` with the minute of the last revealed
Commentary Line (`useLiveMatchCommands`, `CommentaryProvider.submitCommand`) and enables the halftime
instruction when that minute is 45. Minutes are not monotonic in the engine
(`packages/game-engine/src/match/simulate/loop.ts`): first-half stoppage events carry 46–50,
`HalfTimeReached` is stamped 45, and the second half restarts at 46. A command raised during first-half
stoppage is stamped with a second-half minute, and the halftime toggle can open on any regular
first-half event at 45. Stamp commands from the timeline position (half plus minute of the last
revealed event, or the `HalfTimeReached` boundary itself) instead.

Found in review of [ticket 09](09-match-statistics-component.md), which cuts live statistics by
revealed-event count for the same reason.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A command raised during first-half stoppage time applies in the first half
- [x] The halftime instruction is offered only once `HalfTimeReached` has been revealed and before the
      second half's first event
- [x] Tests cover a stoppage-time command and the halftime window
