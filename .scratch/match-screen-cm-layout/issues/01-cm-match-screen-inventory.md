# CM 03/04 match screen inventory

Type: research
Status: resolved

## Question

What do the three CM 03/04 reference screenshots (in-match *Parma Stats*, player *Form* tab, match
*Overview*) contain, element by element, and what does each element mean? Later tickets map every
element onto this game's model, so the list must be complete and each column must be decoded.

## Answer

Resolved inline from the screenshots the user supplied on 2026-10-03; no external source was needed.

**Match screen frame.** Top tabs: Overview, Match Stats, Action Zones, 2D Pitch, Report. Bottom tabs:
*Home* Stats, Player Ratings, Latest Scores, *Away* Stats. A Possession bar runs under both rows, split
in the two clubs' colours.

**Overview.** *Match Incidents*: each side's goalscorers in a column under that side, one line per
scorer with every minute he scored (`Isaac Okoronkwo 45, 57`). Then *Score at half time: 2-4*. Below,
a *Fixture* panel: competition, referee, venue (`Molineux, Wolverhampton`), date, weather
(`Wet 7°C`), attendance.

**Club Stats (one side's players).** One row per matchday squad member in shirt order 1–23: the 11
starters, then named substitutes, then unused squad numbers dimmed. Columns:

| Col | Meaning |
|---|---|
| No. | Squad number |
| C. | Card glyph (yellow square; red when sent off) |
| Inf. | Substitution note: `sub 53` (went off at 53'), `on 53` (came on at 53') |
| Pas / Cmp | Passes attempted / completed |
| Key | Key passes |
| Tck / Won | Tackles attempted / won |
| Hea / Won | Headers attempted / won |
| Key | Key headers |
| Int | Interceptions |
| Run | Runs with the ball |
| Off | Offsides |
| Fou / Fld | Fouls committed / fouled (fouls suffered) |
| Ast | Assists |
| She / Sat | Shots / shots on target |
| Con | Condition, percent |
| Rat | Match rating, 1–10 |
| Gls | Goals |

The selected player's row is highlighted; the captain carries `(c)`.

**Player Form tab** (player profile tabs: Profile, Information, Form, History; a *Team* filter). *Recent
games for <club>*: one row per club fixture, newest first — date, opponent, card glyph, Inf. note, then
the same columns as Club Stats minus No./Con, plus `Not selected` across the row when the player was
not in the squad. Below, *Statistics (Form: 7 8 8 7 7)* — the last five ratings — with rows Non
Competitive, League, Cup, Continental, International, Overall and columns Apps, Gls, Asts, MoM, Yel,
Red, Tck, Pass, Sh Tar, Fouls, Fls Ag, Av R. Rates are percentages; `-` means no value.
