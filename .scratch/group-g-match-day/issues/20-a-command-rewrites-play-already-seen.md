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
stamp at M+1, after the last revealed event, with ticket 16's stoppage rules. 

Raised as [decision request 08](../decision-request-08-live-command-timing-relative-to-revealed-play.md).

**Blocked by:** None

**Status:** resolved

- [x] The decision on when a live command takes effect relative to revealed play is recorded
- [x] After an accepted command, no revealed line is contradicted or repeated, and the scoreboard does not regress

## Comments

**Triaged 2026-09-27: `ready-for-agent`.** [Decision request 08](../decision-request-08-live-command-timing-relative-to-revealed-play.md)
was answered 2026-09-19 with Option A: a live command is stamped at M+1, after the last revealed
event, so revealed play is never re-simulated. Agent Note:
[revealed play is immutable](../../../.agents/notes/implemented/feature/2026-09-19-revealed-play-is-immutable.md).
Its gate, [ticket 31](31-committed-matches-store-their-timeline.md), is resolved. As of this triage
the stamp is still M (`CommentaryProvider.stampMinute`).

## Answer

Resolved 2026-09-27.

- **The minute** is `nextCommandMinute(revealedMinute, halfTimeRevealed)` in
  `packages/game-engine/src/match/commandTiming.ts`: M+1, or 46 once minute 45 or first-half stoppage
  is on screen. The engine applies a minute's commands at the *start* of that minute, before its
  Minute-Slice, and only in the regular 1–45 and 46–90 — so M+1 is the first minute that cannot have
  been shown. Both renderer senders (`CommentaryProvider`, `useLiveMatchCommands`) use it, replacing
  two copies of the old `stampMinute` clamp.
- **The main process holds the rule, not the renderer.** A stamp is a request, so
  `submitMatchCommand` re-derives the timeline and clamps the command past the last revealed Match
  Event. A caller that sends M gets M+1 journaled. `apps/desktop/test/main/match/command-timing.test.ts`
  proves both halves: a command stamped at the revealed minute is journaled a minute later, and every
  event up to the revealed position is byte-identical afterwards.
- **Halftime is the separate path**, and it needed an engine change to keep the guarantee. A halftime
  instruction used to be applied *before* `HalfTimeReached`, so it shared minute 45 with a live
  command given in first-half stoppage. `loop.ts` now pushes the break first, then the halftime
  commands, so a halftime instruction lands after the break and never re-simulates a shown minute.
  `pitch.ts` places a halftime bring-off after those halftime substitutions, and `substitutions.ts`
  classifies a minute-45 Substitution by `half` rather than by position in the timeline — a timeline
  committed before this change still reads correctly, because it distinguishes the two by order.
- **The feed realigns instead of drifting.** While a command is in flight the renderer reveals
  nothing and polls nothing (`commandInFlightRef` joins the existing pause gate), then drops the
  buffered lines, rewinds the cursor to the revealed position and reads on from there. A poll sent
  before the command read the old timeline, so `applyPollView` drops any answer whose request number
  predates it. That is the option-08-B behaviour the Agent Note rejected — but as a consequence of
  stamping at M+1, not instead of it: nothing ahead of the reveal can be contradicted, so the buffer
  only ever holds lines the command leaves intact.
- **The scoreboard** is realigned by the same read, so it does not fall back to `cursor: 0`'s score.

**Boundary, stated rather than hidden:** main's clamp reads the timeline prefix the caller passed as
`revealedEvents`. A `null` is left at the requested minute, on the reading that a caller with no
revealed position has nothing to hold to; both live senders pass a number, so that path is the
contract's, not a live one.

The Agent Note moved `proposed/` → `implemented/`: all four of its points have now shipped (1 in
ticket 40, 2 in 26/34/35, 3 in 23/37, 4 here).
