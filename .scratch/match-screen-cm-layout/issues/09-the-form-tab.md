# The Form tab: rows, season block and Player of the Match

Type: grilling
Status: resolved
Blocked by: 08

## Question

With `player_match_lines` in place ([08](08-where-a-players-match-line-lives.md)), what exactly does the
player Form tab show: which fixtures, which columns, the "Form: 7 8 8 7 7" strip, the per-competition
statistics block, and CM's MoM column, which needs a Player of the Match the game does not define? And
is any of it knowledge-gated, given screen 53 §8's visibility policy?

## Answer

**A Form tab joins the player strip between Information and Development; it lists the player's
current-club fixtures this season and a season block by competition kind; Player of the Match is
defined as the match's highest Match Rating; nothing is knowledge-gated.**

**Placement.** `PlayerScreenFrame`'s `TABS` gains `{ id: "playerForm", label: "Form" }` after
Information, with a `playerForm` destination and route. Its doc comment ("Form and History are absent
… not modelled") is rewritten to say only History is absent. Group D ticket 04's screen-53
disposition (`out-of-scope`, "a dedicated effort if needed") is superseded by this effort; that
ticket gets a one-line pointer here.

**Recent games.** A *Team* selector lists the clubs the player has a line for this season, defaulting
to his current club. For the selected club, one row per played fixture of that club this season,
newest first, from the later of the season start and the date the player joined (from
`player_transfers`), so a January signing's new club does not show him "Not selected" for August.
Columns: date, opponent (with "(a)" when away), C., Inf., then Key, Off, Fou, Ast, She, Sat, Rat, Gls
— the per-player columns of [02](02-per-player-columns-the-stream-backs.md) minus No., Sav and Con
(Sav is added for goalkeepers). A fixture with no row for the player reads **Not selected** across the
row; a row with `started = 0` and no `on_minute` reads **Unused substitute**; a fixture with no lines
at all ([08](08-where-a-players-match-line-lives.md)) reads **No player record**. Unplayed fixtures are
not listed. A row's primary action opens that fixture's Match Report when the fixture is the user's
own (only it keeps a timeline); for other fixtures the row has no action.

**Form strip.** "Form: 7 8 8 7 7": the Match Ratings of the player's last five appearances (started
or came on) across all his clubs, oldest to newest left to right, each rounded to a whole number.
Fewer than five appearances shows as many as exist; none shows "Form: no appearances".

**Season block.** Rows: League, Cup, Continental (only when the player has an appearance in one),
Overall. Reserve fixtures are excluded. No Non Competitive or International row: friendlies and
national teams are not modelled. Columns:

| Column | Definition |
|---|---|
| Apps | Appearances, written `starts (sub)` as in CM's squad screens, e.g. `15 (1)` |
| Gls, Asts | Sums |
| MoM | Times Player of the Match |
| Yel, Red | Sums |
| Sh Tar | Shots on target / shots, as a percentage; `-` when no shots |
| Fouls | Sum |
| Av R | Mean Match Rating over appearances, two decimals; `-` when none |

Tck, Pass and Fls Ag are absent for the reason in [02](02-per-player-columns-the-stream-backs.md).

**Player of the Match.** The player with the highest Match Rating across both sides at full time;
ties broken by goals, then assists, then the winning side's player, then `compareCodeUnits` on player
id, so it is deterministic and locale-free. Computed on read from the lines, never stored, so it moves
with rating weights like everything else. It is a new domain term: the implementing change adds
**Player of the Match** to `CONTEXT.md` beside **Match Rating**, and the post-match Player Ratings view
marks him.

**Visibility.** Match lines are public facts — results, scorers, cards and ratings are what a crowd
and press see — so no knowledge or scouting gate applies. Screen 53 §8's gating is about attributes,
value and reports, none of which this tab shows.

No Agent Note: Player of the Match's definition lives in `CONTEXT.md` and the rest are presentation
choices a ticket records.
