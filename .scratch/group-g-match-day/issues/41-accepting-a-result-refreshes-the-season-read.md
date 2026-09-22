# 41: Starting a match and accepting its result refresh the season read

Split from the review of [37](37-match-day-resumes-a-started-match-after-a-restart.md), 2026-09-21, orchestrator.

**What to fix:** the renderer's `startMatch` and `commitMatchday` (`apps/desktop/src/renderer/rpc/match.ts`)
are plain calls, not Reactivity mutations, so neither invalidates `saveKey`, and `leagueTableAtom` is SWR
with `revalidateOnMount: false`. After Accept result, main clears `awaiting_fixture_id` and
`awaiting_match_id` (`commitMatchday.ts`), but the cached `PendingFixtureView` keeps naming the match until
Continue invalidates the save. Match day, `MatchCommentaryScreen` and `MatchStatsScreen` work around it by
inferring "accepted" from `reachedFullTime` (renderer module state), which confuses "watched to full time
in this process" with "accepted", and is single-slot across saves.

Make both calls invalidate `saveKey` the way `advanceCalendar` does, then remove the `reachedFullTime`
inference from the three screens (37's restart restore in `MatchProvider.tsx` is one of them).

**Blocked by:** None

**Status:** ready-for-agent

- [ ] After Accept result, the pending view no longer names the match, with no Continue in between
- [ ] Match day, Match Commentary and Match Stats decide "accepted" from the season read, not `reachedFullTime`
- [ ] Switching saves between full time and Accept result still restores the unaccepted match
- [ ] `pnpm check:all` green, and e2e
