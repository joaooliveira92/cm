# 05: Post-Match Summary enhancement (99)

**What to build:** Enhance the existing post-match flow beyond the basic score display. Show final score, goalscorers, key match events, and navigation to detailed post-match views (statistics, ratings, report). The match result data is already persisted via `commitMatchday`.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Post-match summary shows final score with goalscorers
- [x] Post-match summary shows key match events (cards, injuries)
- [x] Post-match summary provides navigation to statistics, ratings, and report views
- [ ] Screen is accessible via the post-match tab navigation — not met as written; see Comments
- [x] Loading and error states are handled

## Comments

**Shipped (2026-09-14).** New read RPC `getPostMatchSummary` (`PostMatchSummaryView`: final score and
the Goal, YellowCard, RedCard and Injury Match Events with minute, side and player name), re-derived
from the persisted match stream. `match/PostMatchSummary.tsx` renders it on Match day once the result
is accepted, with buttons to the Statistics, Player ratings and Match report screens (destinations
`matchStats`, `matchRatings`, `matchReport`).

**Shown only after commit.** Screen 99 §17 puts the summary after the final match commit, and a
review link followed before Accept result would drop the uncommitted session. Building that exposed
a bug: the streaming pace ticker kept calling `setPhaseComplete` after full time and flipped an
accepted result back to Accept result. `MatchProvider` now only moves phase from `live`/`paused`, and
clears the session and the Continue lock on `committed`.

**Reachability.** The post-match tab bar is unmounted; tracked on [ticket 13](13-mount-live-match-tab-bar.md).

**Review.** Pass 1 NEEDS_REWORK (pre-commit review links strand the Matchday; ticket 13 did not cover
post-match tabs; review destinations lack a match id). Pass 2 NEEDS_REWORK (with the phase guard,
Continue stayed suspended after Accept). Pass 3 APPROVE.

**Follow-ups.** [14](14-post-match-summary-penalties.md) penalty outcome; [15](15-full-time-session-lost-before-accept.md)
leaving Match day at full time before accepting, and a stale Kick off panel after returning post-commit;
tickets 09–11 carry a note to add `matchId` to their destinations.

