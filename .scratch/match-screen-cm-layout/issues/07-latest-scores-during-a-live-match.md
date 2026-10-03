# Latest Scores during a live match

Type: grilling
Status: resolved
Blocked by: 05

## Question

CM's Latest Scores ticks over live while the user's match plays. Here, the other fixtures of a
Matchday are resolved by `resolveOtherFixturesOn` inside `commitMatchday`, in the same transaction as
the user's result — after the user's match is over. The `match-latest-scores` route is a placeholder.
What does Latest Scores show during the live match and after it?

## Answer

**After the result is accepted: the Matchday's other results. During the live match: the other
fixtures listed without scores, captioned "Results come in at full time."**

- **Post-match** (`other-results` tab, labelled Latest Scores per [05](05-one-tab-bar-for-two-tab-rows.md)):
  every other fixture played on the same date, grouped by competition, with full-time score and
  penalties where a cup tie had them. Read from `fixtures` after commit; before the result is accepted,
  the same "come in at full time" state as live.
- **Live**: the same fixture list, each row "v" with no score. No minute-by-minute scores.

**Why not live scores.** Producing them means resolving the other fixtures at kickoff instead of at
commit and revealing their goals by minute. That moves Matchday resolution out of the commit
transaction that today guarantees the League table never shows a Matchday the player has played and
the division has not (comment in `commitMatchday.ts`), and it requires a second persistence point for
results that are not yet facts. A match abandoned by an app restart would also have to keep or discard
those pre-resolved results. That is a Matchday-resolution redesign, not a screen; it is listed under
Out of scope as its own effort.

No Agent Note: the live half is a scoping call, recorded on the map; the post-match half is a plain
read.
