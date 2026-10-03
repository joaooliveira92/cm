# One tab bar for CM's two tab rows

Type: grilling
Status: resolved
Blocked by: 01

## Question

CM puts five tabs above the match (Overview, Match Stats, Action Zones, 2D Pitch, Report) and four
below (Home Stats, Player Ratings, Latest Scores, Away Stats), with a Possession bar under both. This
game already mounts one `SecondaryNav` for match routes, driven by `MATCH_TAB_CONFIGS` in
`apps/desktop/src/renderer/navigation/match-nav-config.ts` and `matchRouteToTabId` in
`nav-route-parser.ts`. Where does each CM tab land, what is persistent across tabs, and what happens to
the `match-player-stats` placeholder route?

## Answer

**One tab bar, no second row.** Two bars would split keyboard navigation across two roving-focus
groups and duplicate `SecondaryNav`'s role; the CM bottom row exists because its window had no side
navigation, which this shell has.

**Live match tabs, in order:** Match, Commentary, Statistics, Home Stats, Away Stats, Player Ratings,
Latest Scores, Tactics, Substitutions, Opposition, Live Table (conditional, unchanged).

**Post-match tabs, in order:** Summary, Statistics, Home Stats, Away Stats, Player Ratings, Report,
Commentary, Latest Scores, Table (conditional, unchanged). Report joins the bar here; today it is only
reachable by a link carrying `matchId`.

**Mapping from CM:**

| CM tab | Here |
|---|---|
| Overview | **Match** (live) / **Summary** (post-match); content per [06](06-the-overview-incidents-and-fixture-panel.md) |
| Match Stats | **Statistics** (existing `MatchStatsView`, gains corners/free kicks/penalties per [03](03-team-statistics-corners-and-possession.md)) |
| Report | **Report** (existing screen) |
| Home Stats / Away Stats | **Home Stats** / **Away Stats**: the per-player table of [02](02-per-player-columns-the-stream-backs.md) |
| Player Ratings | **Player Ratings** (existing `MatchRatingsView`) |
| Latest Scores | **Latest Scores**, per [07](07-latest-scores-during-a-live-match.md) |
| Action Zones, 2D Pitch | Not built — out of scope (no spatial model) |

**Labels.** Tab labels stay static ("Home Stats", "Away Stats") so a tab's label and hotkey never
change between matches; the screen heading names the club ("Parma Stats"). The post-match tab id
`other-results` keeps its id and is relabelled "Latest Scores", so the two contexts read the same.

**Routes.** New flat routes `match-home-stats` and `match-away-stats`, both rendering one
`MatchPlayerStatsScreen` with a `side` prop, registered in the router and in `matchRouteToTabId`. The
`match-player-stats` placeholder route and its screen are deleted: it is the screen these routes
replace, and a placeholder left beside the real one is a dead destination. `match-replays` stays a
placeholder (out of scope, not this effort's to delete).

**Persistent across tabs:** the existing `MatchHeader` (score and clock) above, and the Attacks bar
([03](03-team-statistics-corners-and-possession.md)) mounted once in the match route shell below,
in both live and post-match contexts, not per screen. Pre-match shows neither.

No Agent Note: this is screen arrangement on existing navigation, reversible without losing a
decision's reasoning.
