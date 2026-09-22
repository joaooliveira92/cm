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

**Status:** resolved

- [x] After an app restart with a started, uncommitted match, Match day shows the live feed replaying from kickoff, not the Kickoff panel
- [x] The match can then be played to full time and its result accepted
- [x] A same-session remount still continues from the revealed position (ticket 23)
- [x] An e2e journey restarts the app mid-match; `pnpm check:all` green

## Answer

Resolved 2026-09-21. A new read, `getAwaitingMatch { saveId, matchId }`, returns the started match's
existing `MatchSummary` (built by `matchSummaryOf`, which `startMatch` now shares). It refuses an unknown
match (`MatchNotFoundError`) or one the season no longer awaits (`FixtureNotPendingError`). `MatchProvider`
calls it when there is no in-process session and the pending Fixture names a started match, then plays it
live. With no session, the feed replays from kickoff. A same-session remount still continues from the
revealed position (23).

Review: APPROVE. Its three lows are fixed in place: an abandoned read gives Play back (the phase no longer
sticks at "starting"), a stale refusal from a key press during the read is cleared once the match is live,
and the read takes the Fixture id from the season's own link. Split out:
[41](41-accepting-a-result-refreshes-the-season-read.md) (the season read goes stale after Accept result, which
the `reachedFullTime` guard here works around) and [42](42-quick-result-skips-the-live-reveal.md) (Quick result
still plays a paced reveal, against the glossary). A Quick match left unaccepted across a restart is
restored as a live replay, because the mode is persisted nowhere.

Unblocks [33](33-a-restarted-live-match-says-so.md): the restart restore is exactly its "restarted" signal.
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
