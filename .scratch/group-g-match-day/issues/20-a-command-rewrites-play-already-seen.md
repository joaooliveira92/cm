# 20: A live command rewrites play the manager has already seen, and the feed is not realigned

**What to fix:** found in the review of [ticket 18](18-substitution-count-reads-the-whole-match.md).

- The engine applies a command at the start of its minute (`packages/game-engine/src/match/simulate/loop.ts`,
  `applyScheduledCommands` before `resolveSlice`). Commands are stamped at the revealed minute M
  ([ticket 16](16-live-commands-stamped-by-revealed-minute.md)), so minute M is re-simulated after
  its lines have been shown, and a goal or injury the manager saw can disappear.
- `CommentaryProvider.applyCommandResult` leaves `cursorRef` and the buffered lines alone. Lines from
  the old timeline are still revealed, and the next poll resumes at the old cursor in the new
  timeline, which can repeat or mismatch lines.
- The command is sent with `cursor: 0`, so the response's score is the score at the end of the first
  chunk, and the scoreboard falls back until the next poll.

This needs a decision before a fix, because it changes when a command takes effect. One option is to
stamp at M+1, after the last revealed event, with ticket 16's stoppage rules. Raise a decision request
if the choice has player-visible consequences beyond "the change applies from the next minute".

**Blocked by:** None

**Status:** needs-triage

- [ ] The decision on when a live command takes effect relative to revealed play is recorded
- [ ] After an accepted command, no revealed line is contradicted or repeated, and the scoreboard does not regress
