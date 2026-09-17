# 28: Save-keyed session writes and reads can still cross from one match to the next

**What to fix:** found in the re-review of [ticket 23](23-match-day-remount-replays-from-kickoff.md).

- **Stale values carried into the next match.** `session.ts` `liveFor` lets the next match take over a
  `{ matchId: null }` live context. A save-only write that lands after `clearActiveMatch` (for
  example a `recordRevealedScore` from a read in flight across Accept result) creates such a context,
  and the next match inherits its stale score, minute, `halfTimeRevealed` and `liveTactic`.
- **Readers ignore the match.** `getRevealedEvents`, `getRevealedMinute`, `getRevealedScore` and
  `getHalfTimeRevealed` never check the match, so a late `recordRevealedLines` for the previous match
  would feed its count into the next match's first poll.
- **Late decision response dropped.** The unmount guard drops a late command response that resolved
  a paused decision (Bring off answered after leaving), so returning re-offers the same decision. It
  recovers in one click.

These are barely reachable today, since the pace buffer is empty after commit. Smallest fixes: keep
only `liveTactic` when taking over a null context, or make save-only writers no-op without an active
match; key the readers by match; let `updateInjuries` record while the session is still paused.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] No value from a committed match is visible to the next match's session readers
- [ ] A decision resolved by a response that lands after leaving Match day is not re-offered on return
- [ ] `session.test.ts` covers both
