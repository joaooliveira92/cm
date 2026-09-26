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

**Status:** resolved

- [x] No value from a committed match is visible to the next match's session readers
- [x] A decision resolved by a response that lands after leaving Match day is not re-offered on return
- [x] Tests cover both (the no-residue half in `session.test.ts`, the late-decision half at provider level)

## Answer

Resolved 2026-09-17. The renderer match session is tied to the active match.

- **Writes.** Every writer takes the match id and is a no-op unless that match is the save's active
  match. A late write after `clearActiveMatch`, or for a previous match, is dropped.
- **Readers.** They keep `(saveId)` and return only the active match's values, defaults otherwise.
  The null-context takeover is gone, and `liveTactic` is per-match.
- **Late decision.** `CommentaryProvider.updateInjuries` records while mounted, or while unmounted
  only if the active session is still `paused`. It applies the removal to the session's held injuries.
  Ticket 23's unmount guard for score and counts stays.

The reviewer traced every write path: kickoff, phase changes, commit, remount, restart, standalone
screens. None lands before `setActiveMatch`, and post-commit screens read the retained `fullTime`
marker, as before.

**Tests.**

- `session.test.ts`: the next match sees nothing a write for the committed match left; a late write
  for the previous match does not move the next match's position, minute, score or half time.
- `remount-continues-reveal.test.tsx`: "does not offer again a decision a response that landed after
  leaving resolved". The criterion was reworded, since this half lives at provider level.

All three failed first.

**Review.** APPROVE, with lows accepted:

- After a late Bring off lands while away, counts are stale until the first poll after return.
- A late response that lands after the manager has already returned still shows the decision until
  one click.
