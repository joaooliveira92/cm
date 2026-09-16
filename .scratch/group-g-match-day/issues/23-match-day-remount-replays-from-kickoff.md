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

**Status:** claimed

- [ ] Leaving and returning to Match day continues from the revealed position, not kickoff
- [ ] A command raised after returning is stamped at the true revealed minute
