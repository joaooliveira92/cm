# 16: Latest Scores

**What to build:** A Latest Scores tab, live and post-match, lists the other fixtures on the user's
fixture date grouped by competition. Until the user's result is accepted each row shows no score, under
"Results come in at full time."; afterwards each shows the full-time score and penalties where a cup
tie had them. The post-match tab keeps its id and is relabelled Latest Scores. It replaces the
latest-scores placeholder. Defined in [07](07-latest-scores-during-a-live-match.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Before acceptance no score is shown for any other fixture; after acceptance every one is.
- [x] A drawn cup tie shows its penalties.
- [x] Both tab bars label the tab "Latest Scores".
