# 37: Match day resumes a started match after an app restart

Split from [33](33-a-restarted-live-match-says-so.md), 2026-09-21, orchestrator. Found by the implementator
before any code was written.

**What to fix:** closing the app mid-match strands the career. `MatchProvider`
(`apps/desktop/src/renderer/match/MatchProvider.tsx`) takes the match only from `getActiveMatch` — renderer
module state that dies with the process — or from a fresh `startMatch`. It never reads
`PendingFixtureView.matchId`, whose contract comment promises "Non-null means Match day resumes that stream
rather than starting a new one". So after a restart Match day shows the Kickoff panel, and Play or Quick
result fails: `startMatch` (`apps/desktop/src/main/match/start.ts`) refuses with `MatchAlreadyStartedError`
while `season.awaitingMatchId` is set, and the error copy tells the manager to return to Match day, where
they already are. Nothing else clears the link, so the Fixture can be neither played nor accepted.

When there is no in-process session and `pending.matchId` is non-null, Match day hydrates that match and
enters the live phase; the feed replays from kickoff (`CommentaryProvider` starts at cursor 0). The renderer
cannot build a `MatchSummary` from what it has today (`PendingFixtureView` carries only the opponent and
`isHome`), so this needs a contract change: the human club's id and name on `PendingFixtureView`, or a read
that returns the existing `MatchSummary`. Either is schema'd in `packages/contracts` with a roundtrip test.

**Decisions:** [revealed play is immutable](../../../.agents/notes/proposed/feature/2026-09-19-revealed-play-is-immutable.md)
point 3 (persisting the revealed position) is a later step and not this ticket; this ticket restores the
replay-from-kickoff behaviour that ticket 31 and decision request 05 assumed already existed.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] After an app restart with a started, uncommitted match, Match day shows the live feed replaying from kickoff, not the Kickoff panel
- [ ] The match can then be played to full time and its result accepted
- [ ] A same-session remount still continues from the revealed position (ticket 23)
- [ ] An e2e journey restarts the app mid-match; `pnpm check:all` green
