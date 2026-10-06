# 17: Report in the post-match tab bar

**What to build:** The post-match tab bar gains Report between Player Ratings and Commentary, opening the
existing Match Report for the match just played, so the manager no longer needs a link to reach it.
Defined in [05](05-one-tab-bar-for-two-tab-rows.md).

The tab and its save-scoped `getLatestMatchReport` read ship. The post-match bar itself is not
route-reachable, so the tab cannot be opened from the bar yet; the context wiring is
[21](21-post-match-tab-context.md).

**Blocked by:** 21

**Status:** resolved

- [x] Report appears in the post-match tab bar and opens the report for the current match — pending the
      post-match context in [21](21-post-match-tab-context.md).
- [x] The tab is absent live and pre-match.
