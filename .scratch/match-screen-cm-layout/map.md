# Map: CM 03/04 match screen

Label: `wayfinder:map`

> Status: charted and complete on 2026-10-03. Tickets 01–11 are resolved; the frontier is empty and
> nothing is left to decide. Every decision was settled by the agent without a human in the loop, at
> the user's request ("resolve all the questions autonomously"); the grilling tickets were therefore
> worked AFK, against the code and the standing Agent Notes. Ready for `/cm-to-spec`.

## Destination

Every decision needed to rebuild the match screens in the image of CM 03/04's match view (Overview
with Match Incidents and fixture panel, per-club player stats tables, Latest Scores, the persistent
bottom bar) and the player Form tab is settled, so `/cm-to-spec` can write the spec without asking a
question. Plan only: no code in this effort.

## Notes

- Source material: three CM 03/04 screenshots supplied by the user on 2026-10-03, decoded in
  [01](issues/01-cm-match-screen-inventory.md).
- The governing rule for every value on these screens is [the match model shows only what it produces](../../.agents/notes/implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md):
  derive from the Match Event stream, never invent. This map applies it to the engine as it is now,
  which records much more than when the rule was set.
- Builds on [Group G](../group-g-match-day/map.md) (statistics, ratings, report, tab bar already
  shipped) and reopens Group D's screen 53 (Player Form).
- Skills for the implementing sessions: `effect-code` (main-process reads and the commit
  transaction), `tdd` at the pure-fold seam, `doc-standards` for the `CONTEXT.md` entries.

## Decisions so far

- [CM 03/04 match screen inventory](issues/01-cm-match-screen-inventory.md): every tab, panel and
  column of the three screenshots, decoded.
- [Which per-player columns the stream backs](issues/02-per-player-columns-the-stream-backs.md):
  twelve columns folded from recorded events; passes, tackles, headers, interceptions, runs and fouls
  suffered are not drawn.
- [Team statistics: corners, possession and the footer bar](issues/03-team-statistics-corners-and-possession.md):
  corners, free kicks and penalties become counted; the possession proxy becomes "Attacks" and drives
  the bottom bar; possession stays unavailable.
- [The Match Rating reads the recorded involvement](issues/04-match-rating-reads-recorded-involvement.md):
  assists, key passes, saves, fouls and offsides become rating weights; ratings recompute on read.
- [One tab bar for CM's two tab rows](issues/05-one-tab-bar-for-two-tab-rows.md): Home Stats, Away
  Stats, Latest Scores and Report join the existing `SecondaryNav`; no second bar.
- [The Overview: incidents, half-time score and fixture panel](issues/06-the-overview-incidents-and-fixture-panel.md):
  scorers with minutes and `(pen)`, half-time score, competition/date/venue; no referee, weather or
  attendance.
- [Latest Scores during a live match](issues/07-latest-scores-during-a-live-match.md): results after
  the result is accepted; live shows fixtures without scores.
- [Where a player's match line lives](issues/08-where-a-players-match-line-lives.md): a
  `player_match_lines` table written in the commit transaction for every squad-bearing fixture; counts,
  never ratings.
- [The Form tab](issues/09-the-form-tab.md): recent games, the five-rating form strip, a season block
  by competition kind, and Player of the Match as the highest Match Rating.
- [Table look and reading aids](issues/10-table-look-and-reading-aids.md): `DataTable` in the
  shared dense look, abbreviations with full accessible names, one rating-tone helper.
- [Reconcile records found stale while charting](issues/11-reconcile-records-found-while-charting.md):
  eleven comments, records and notes, each assigned to the change that makes it stale.

## Not yet specified

None. Charting surfaced no fog the tickets above did not settle.

## Out of scope

- **Action Zones and 2D Pitch tabs.** The engine has no spatial model (no coordinates, no zones);
  either tab would draw invented positions. A match-engine effort.
- **Passes, tackles, headers, interceptions, runs with the ball, fouls suffered, and possession.**
  Each needs new engine events that change what every seed produces. One engine-detail effort, safe
  for committed matches because timelines are stored; the column list and statistics keys widen
  without a rewrite when it lands.
- **Referee, weather and attendance.** No model for any of the three; attendance is not derivable
  from stadium capacity. See [06](issues/06-the-overview-incidents-and-fixture-panel.md).
- **Live scores from other fixtures.** Needs Matchday resolution moved out of the commit transaction.
  See [07](issues/07-latest-scores-during-a-live-match.md).
- **Non Competitive and International form rows, and Player History (screen 55).** Friendlies,
  national teams and career history are not modelled.
- **Backfilling match lines for existing saves.** Saves are disposable during development; history
  starts with a new save.
