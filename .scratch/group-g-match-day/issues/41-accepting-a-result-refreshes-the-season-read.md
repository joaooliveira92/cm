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

**Status:** resolved

- [x] After Accept result, the pending view no longer names the match, with no Continue in between
- [x] Match day, Match Commentary and Match Stats decide "accepted" from the season read, not `reachedFullTime`
- [x] Switching saves between full time and Accept result still restores the unaccepted match
- [x] `pnpm check:all` green, and e2e

## Answer

Resolved 2026-09-22. `startMatch` and `commitMatchday` are now Reactivity mutations
(`startMatchMutation`, `commitMatchdayMutation` in `renderer/rpc/mutations.ts`) that invalidate `saveKey`
after success, as `advanceCalendar` does; the plain calls are gone, so nothing can skip the refresh. The
`reachedFullTime` module state is removed. Match day's restart restore decides from the season read and
waits while that read is refreshing (and while a start is in flight). Match Commentary and Match Stats show
an awaiting match in full only when this save's session holds it at full time (`revealedToFullTime`).

Visible consequences, all fixes: the header's "Go to Match" becomes Continue as soon as Accept result lands;
Match Home Team and Match Away Team show the started match's sheet during play instead of loading until
Continue; switching saves between full time and Accept result no longer loses the unaccepted match. The
orchestrator also made those two screens pass `null` rather than `undefined` for "no awaited match"
(review L2), which this change made reachable right after Accept result.

Left (lows): no test forces the start-in-flight ordering the `startingRef` guard protects; the kickoff
refresh re-runs the live panel's tactics effect harmlessly, but a future mid-match `saveKey` invalidation
would reset an unapplied draft; tickets 10 and 11 still mention `reachedFullTime`.
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
