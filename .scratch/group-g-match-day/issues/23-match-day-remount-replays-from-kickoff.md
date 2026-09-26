# 23: Returning to Match day replays the live feed from kickoff

**What to fix:** `CommentaryProvider` starts with `cursorRef = 0` and `revealed = []` on every mount,
and nothing restores them. `MatchProvider`'s recorded cursor never reaches streaming. Leaving Match
day for another screen and coming back replays the feed from kickoff, and `recordRevealedEvents` and
`recordRevealedMinute` rewind with it. Any command raised during the replay is stamped at the replay
minute and rewrites everything after it. Substitutions made at minute 60 are counted at replay
minute 2 (the manager-substitution exemption in `view.ts`).

Restore the revealed position, and ideally the revealed lines, from the match session (`session.ts`)
on mount.

Found in the review of [ticket 18](18-substitution-count-reads-the-whole-match.md).

**Blocked by:** None

**Status:** resolved

- [x] Leaving and returning to Match day continues from the revealed position, not kickoff
- [x] A command raised after returning is stamped at the true revealed minute

## Answer

Resolved 2026-09-16, within one renderer process. An app restart still replays from kickoff:
[decision request 05](../decision-request-05-revealed-position-across-restart.md).

- **Session.** The live context is keyed by save and match (`matchId`). It stores the revealed lines
  (so the position is their count), revealed injuries with `capReachedWhenRevealed`, the last revealed
  injury, and the controlled club's substitution counts. `getRevealedFeed(saveId, matchId)` returns
  them, or empty values for another match. The dead `cursor`/`streamComplete` fields and
  `MatchProvider`'s dead refs are gone.
- **Restore.** `CommentaryProvider` seeds its state from the session in its initialisers: lines,
  score, minute, injuries, counts (marked known), the cap ref, the cursor (revealed line count) and
  the paused phase. The first render after returning therefore shows the feed and the correct decision
  mode. A restore paused on a revealed injury makes one read to refresh from the server. Polls, re-reads
  and commands all go through `applyClubSubs`, which records the counts. Session writes from an unmounted
  provider are skipped.
- **Commands.** A command raised straight after returning is stamped at the restored minute.
- **Commentary screen.** The empty state distinguishes no match from nothing revealed yet, and
  "Loading commentary..." no longer hangs without a match.

**Tests.**

- `remount-continues-reveal.test.tsx`: continues from the position; a command is stamped at the true
  minute; an injury pause survives; counts come back before any read; one read on a paused return.
- `remount-injury-decision.test.tsx`: the real panel offers Play on and Bring off with "Cap reached"
  on the first render after return.
- `session.test.ts`: the context is keyed by match.
- `match-commentary-screen.test.tsx`: empty-state copy.
- `screen-fulltime.test.tsx` now seeds through the session recorders and passes.
- The e2e `router.spec.ts` AC-15 check compares the feed before leaving with the feed on return,
  reading once without retries.

**Review.** The first review returned NEEDS_REWORK:

- H1: the paused decision was lost on return.
- L1: late writes from an unmounted provider.
- L2: the e2e replay guard retried.
- L4: the live context was keyed by save only.
- L3: `session.ts` imported a type from the provider.

The re-review found all of them resolved: APPROVE. Its two new low findings are filed as
[28](28-match-session-save-keyed-residue.md). The hardcoded header readout is filed as
[27](27-live-match-header-readout-shows-0-0.md).
