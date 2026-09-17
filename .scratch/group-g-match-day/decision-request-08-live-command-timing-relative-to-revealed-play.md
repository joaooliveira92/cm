# Decision Request 08: When does a live command take effect relative to revealed play?

**From:** ticket 20 (a-command-rewrites-play-already-seen.md)
**Date:** 2026-09-17

## Context

The match engine applies a scheduled command at the start of its target minute (`applyScheduledCommands` before `resolveSlice` in `loop.ts`). Commands are stamped at the revealed minute M (ticket 16). This means minute M is re-simulated after its commentary lines have been shown, so a goal or injury the manager already saw can disappear.

After the command is applied, `CommentaryProvider.applyCommandResult` leaves `cursorRef` and buffered lines alone. Lines from the old timeline are still revealed, and the next poll resumes at the old cursor in the new timeline, which can repeat or mismatch lines.

The command is sent with `cursor: 0`, so the response score is the score at end of first chunk, and the scoreboard regresses until the next poll.

## The decision

When does a live command take effect relative to revealed play?

**Option A:** Stamp at M+1 (the minute after the last revealed event). The change applies from the next minute onward. No re-simulation of revealed play. Cleaner for the feed but changes when a change is felt.

**Option B:** Stamp at M as currently done, but realign the feed — discard old buffered lines, reset cursor, and update the scoreboard immediately. Harder to implement but keeps the current command-delivery semantics.

**Option C:** Something else (e.g., batch commands to the half-time or full-time boundary).

The choice has player-visible consequences for what the manager sees after a live change, and the feed is visible game feedback.

**Status:** open