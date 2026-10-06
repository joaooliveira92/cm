# Research: per-match figures to calibrate the match engine against

Answers [ticket 05](../../.scratch/match-engine-detail/issues/05-cm-calibration-figures.md): the
per-team and per-player counts a top-flight match produces, and what Championship Manager 03/04 showed.
It sets target ranges for `calibrate.test.ts` and decides nothing else.

## Sources

- **O. Opta, through the Premier League's stats API.** These are season totals per club from the feed
  behind [premierleague.com/stats](https://www.premierleague.com/stats). The endpoint is
  `https://footballapi.pulselive.com/football/stats/ranked/teams/<stat>?comps=1&compSeasons=<id>`, and
  it needs the header `Origin: https://www.premierleague.com`. The stats used are `total_pass`,
  `accurate_pass`, `total_tackle`, `won_tackle`, `interception`, `fk_foul_lost`, `aerial_won` and
  `aerial_lost`. The season ids are 15 = 2006/07, 17 = 2008/09, 42 = 2015/16, 578 = 2023/24 and
  719 = 2024/25. Seasons before 2006/07 return no data. Per-match figures are each total ÷ (20 clubs × 38).
  This source gives season means and club-to-club spread, not per-match distributions.
- **S. StatsBomb Open Data** ([github.com/statsbomb/open-data](https://github.com/statsbomb/open-data),
  now mirrored at `hudl/open-data`). I computed the counts from raw events (data version 1.1.0) for:
  - **S15**, Premier League 2015/16: all 380 matches, competition 2, season 27.
  - **S03**, Premier League 2003/04: Arsenal's 38 matches only, competition 2, season 44. This is the
    season CM 03/04 models, but every match includes Arsenal.

  Event definitions come from the
  [Open Data Events v4.0.0 spec](https://github.com/statsbomb/open-data/blob/master/doc/Open%20Data%20Events%20v4.0.0.pdf).
  Per-player rows count only starters who played the full match (not substituted and not sent off),
  grouped by starting position.
- **D. Opta event definitions**: [statsperform.com/opta-event-definitions](https://www.statsperform.com/opta-event-definitions/).
- **P. Opta's possession formula**, as reported by
  [Slate, 27 June 2014](https://www.slate.com/blogs/the_spot/2014/06/27/soccer_possession_the_inside_story_of_the_game_s_most_controversial_stat.html).
  This is journalism, not an Opta document, so treat it as medium confidence.
- **C. CM 03/04 itself.** One retail 4.1.4 screenshot of the in-match *Parma Stats* table
  (Darmstadt 0-1 Parma, full time):
  [MobyGames 219927](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219927/),
  read from the Wayback thumbnail. It covers one team in one match, so it has **low confidence** as a
  distribution and is only good for orders of magnitude. No community document with numeric
  averages turned up. FBref returned 403 (Cloudflare) and could not be used.

## Per team per match

The target ranges are my synthesis. They centre on modern Opta (2023/24 to 2024/25) and are widened
toward the 2000s figures where the eras differ.

| Statistic | Target mean | Target per-match range | Evidence |
|---|---|---|---|
| Passes attempted | 440-480 | 330-630 (p10-p90) | O 2024/25 447 (clubs 341-605); O 2023/24 470; O 2015/16 437; O 2006/07 359; S15 485 (p10 347, p90 625, including throw-ins); S03 476 |
| Pass completion | 76-83 % | 66-86 % | O 2024/25 83.7 %; O 2015/16 78.4 %; O 2006/07 70.4 %; S15 76.6 % pooled (p10 66 %, p90 83 %); S03 74.2 % |
| Tackles attempted | 17-21 | 12-28 | O 2024/25 17.6 (clubs 13.1-21.5); O 2015/16 19.4; O 2006/07 23.8; S15 20.3 (p10 13, p90 28); S03 23.6 |
| Tackles won | 10-13 (about 60 %) | 7-17 | O 2024/25 10.5 (60 %); O 2015/16 14.6 (75 %, older definition, see below); S15 12.2 (60 %, p10 7, p90 17); S03 13.5 (57 %) |
| Aerial duels contested | 27-44 | 25-63 | O 2024/25 26.4 (13.2 won + 13.2 lost); O 2015/16 32.5; S15 44.3 (p10 27, p90 63); S03 40.8 |
| Aerial duels won | half of contested | 8-33 | O 2024/25 13.2 (clubs 8.2-16.6); S15 22.2 (p10 12, p90 33) |
| Interceptions | 8-12 | 4-17 | O 2024/25 7.9 (clubs 5.9-9.4); O 2015/16 17.0; O 2006/07 6.6; S03 8.0 (p10 4, p90 13); S15 is unusable (see below) |
| Fouls committed | 11-13 | 7-18 | O 2024/25 11.1 (clubs 7.6-13.8); O 2015/16 10.8; O 2006/07 13.7; S15 12.5 (p10 8, p90 18); S03 17.0 |
| Fouls suffered | about the opponent's fouls committed | 7-17 | S15 12.0 (p10 7, p90 17); S03 16.3 |

**Possession**, S15 with 760 team-matches. The mean is 50 % by construction.

| Method | p10-p90 (one side) | Matches where a side has more than 60 % | More than 65 % | More than 70 % |
|---|---|---|---|---|
| Share of passes attempted (FBref-style) | 36-64 % | 34 % | 15 % | not computed |
| Share of completed passes (Opta's formula, P) | 32-68 % | 48 % | 29 % | 14 % |
| Share of in-play time (gap to next event, credited to the team in possession) | 38.5-61.6 % | 28 % | 8 % | not computed |

S03 gives 31 %, 47 % and 21 % for the three methods. The most extreme team-match in S15 was
76 / 24. **Target**: about 70 % of team-matches fall in 40-60 %, a side tops 60 % in roughly
30-35 % of matches, and tops 70 % in under 10 % of matches.

## Per player per match, by role (S15, full-90 starters)

| Role (n) | Passes (p10-p90) | Completion | Tackles (won) | Aerials (won) | Interceptions | Fouls committed | Fouls suffered |
|---|---|---|---|---|---|---|---|
| GK (753) | 30 (22-39) | 56 % | 0 | 0 | 0 | 0.0 | 0.1 |
| CB (1,458) | 41 (20-65) | 82 % | 1.7 (1.0) | 5.6 (3.6) | 1.5 | 0.8 | 0.5 |
| FB/WB (1,342) | 54 (34-74) | 75 % | 2.5 (1.4) | 3.3 (1.8) | 1.4 | 1.1 | 0.9 |
| DM (700) | 57 (36-83) | 83 % | 2.8 (1.8) | 3.5 (1.9) | 1.7 | 1.7 | 1.2 |
| CM (522) | 54 (32-78) | 82 % | 2.7 (1.7) | 3.0 (1.5) | 1.3 | 1.5 | 1.3 |
| Wide midfielder (250) | 41 (25-59) | 72 % | 1.8 (1.1) | 3.3 (1.3) | 0.9 | 1.3 | 1.8 |
| AM (244) | 52 (29-77) | 79 % | 1.6 (1.1) | 3.0 (1.0) | 0.7 | 1.1 | 1.8 |
| Winger (425) | 43 (24-64) | 75 % | 1.7 (1.1) | 2.8 (1.1) | 0.8 | 1.1 | 1.8 |
| Striker (512) | 28 (17-39) | 70 % | 0.9 (0.5) | 9.4 (3.9) | 0.3 | 1.3 | 1.6 |

S03 agrees within about 20 % for every role. One exception: midfielders there commit and suffer
more fouls, at 2.4-2.9 for DM and CM. The interception column has the S15 problem described below,
so scale it down by about 0.5-0.7.

## What CM 03/04 showed (C, low confidence)

- **Match screen, per player.** The columns are *Pas, Cmp, Key, Tck, Won, Key, Hea, Won, Key, Int,
  Run, Off, Fou, Fld, Ast, Sho, Sot, Con, Rat, Gls*. Possession appears only as a bar. The
  player-profile season table instead uses *Tck, Pass, Sh, Tar, Fouls, Fls Ag*
  ([screen reference](cm-0304-screen-reference.md)).
- **One team-match**, Parma's 16 used players added up:
  - 246 passes at 70 % completion
  - 18 tackles, of which 17 won (94 %)
  - **131 headers**, of which 86 won (66 %)
  - 25 interceptions
  - 12 fouls committed and 6 suffered
  - 9 shots, 5 on target

  Compared with real football, CM passes about half as much and heads about three times as often.
  For example, one CB recorded 28 headers (22 won), against 5.6 in S15. Tackles in CM are almost
  always "won". Each starter recorded 10-32 passes, against 30-57 in real football.
- **Inferred**: CM 03/04's counts are its own event model and not a calibration target. Use them only
  if the game should *feel* like CM, and keep the real-world tables as the default target.

## Definitions differ between providers

- **Tackle won.** Opta (D) counts a tackle as won when the tackler's team gains possession *or the ball
  goes safely out of play*. StatsBomb counts *Won*, *Success In Play* and *Success Out* duel outcomes.
  Opta's won share fell from 72-75 % (2006/07 to 2015/16) to 59-60 % (2018/19 onward), and its
  attempts fell from about 19 to about 17. **Inferred**: Opta tightened its definition around 2017/18;
  no change note was found. Today's Opta and S15 both sit at about 60 %.
- **Interceptions.** Opta's season means jump around: 6.6 (2006/07), 13.6 (2007/08), 17.0 (2015/16),
  then a steady fall to 7.9 (2024/25). In S15 the count roughly triples mid-season, from about 6 per
  team (August-December 2015) to about 17 (January-May 2016), so S15 interceptions are unusable. The
  table's 8-12 leans on modern Opta and S03.
- **Aerials.** Opta logs one won and one lost per duel. StatsBomb logs an *Aerial Lost* duel and puts
  an `aerial_won` flag on the winner's pass, clearance, shot or miscontrol. StatsBomb records about
  35 % more aerial contests than Opta for the same season.
- **Passes.** Opta and StatsBomb both count a pass as complete when it reaches a teammate untouched.
  The S15 figures include throw-ins (about 23 per team); excluding them changes completion by under
  0.5 points. Opta's pass totals were much lower in 2006/07 to 2008/09 (359-391), which looks like a
  change in collection granularity, not in how teams played.
- **Fouls suffered.** This is a separate *Foul Won* event and runs about 4 % below the opponent's fouls
  committed, because the difference is fouls with no free kick awarded, such as advantage played.
- **Possession.** Opta (P) uses the share of completed passes. FBref uses the share of attempted
  passes. Some broadcasters use timed possession. The same matches give a side over 60 % in 28 %, 34 %
  or 48 % of matches depending on the method, so the engine's possession figure must name its method
  before its spread is asserted.
