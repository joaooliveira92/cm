# Spec: CM 03/04 match screen

Status: ready-for-agent

Source map: [map.md](map.md). Every decision below was settled there.

## Problem Statement

During and after a match, the manager can see team totals, a ratings list, commentary and a report,
but not what each player did. There is no per-player table like the CM 03/04 *Club Stats* tab, no
at-a-glance "who is on top" bar, no Match Incidents panel with scorers and minutes, no fixture panel,
and no Latest Scores. After the match, nothing records a player's part in it beyond the user's own
stored timeline, so no player has a Form tab: the manager cannot see how a player has been performing
across recent matches, for his own squad or for a player he is watching.

## Solution

The match screens take the shape of CM 03/04's match view, showing only what the match records:

- **Home Stats** and **Away Stats** tabs list each matchday squad member with their card, substitution
  note, key passes, offsides, fouls, assists, shots, shots on target, saves (goalkeepers), condition,
  Match Rating and goals, live and after the match.
- A persistent **Attacks** bar under every live and post-match tab shows each side's share of the
  attacks.
- The live **Match** tab and the post-match **Summary** show **Match Incidents** (scorers with every
  minute, penalties marked, sendings-off), the half-time score, and a fixture panel (competition,
  round, date, venue).
- A **Latest Scores** tab lists the Matchday's other fixtures, with results once the user's result is
  accepted. **Report** joins the post-match tab bar.
- The Match Rating rewards assists, key passes and saves, and marks fouls and offsides.
- Every player in every match where both clubs field a squad gets a **Match Player Line**, stored when
  the Matchday is committed. A **Form** tab on every player shows his recent games, a five-match form
  strip, and season totals by competition with **Player of the Match** awards.

## User Stories

1. As a manager watching a live match, I want a Home Stats tab listing my players with what each has done so far, so that I can spot who is struggling before I make a substitution.
2. As a manager watching a live match, I want an Away Stats tab for the opposition, so that I can see which of their players is causing the damage.
3. As a manager, I want the stats tables cut at the moment of play I have seen, so that they never reveal what has not happened on screen yet.
4. As a manager, I want each player's goals, assists, shots and shots on target, so that I can judge his attacking contribution.
5. As a manager, I want each player's key passes, so that I can credit the players creating chances, not only the ones finishing them.
6. As a manager, I want a goalkeeper's saves, so that I can tell a busy keeper from an idle one.
7. As a manager, I want each player's fouls and offsides, so that I can see discipline and timing problems.
8. As a manager, I want each player's condition in the table, so that I can decide who needs replacing.
9. As a manager, I want a card glyph with a text equivalent on a booked or sent-off player's row, so that I can see disciplinary risk without relying on colour.
10. As a manager, I want "off 53" and "on 53" substitution notes, so that I can read who played when.
11. As a manager, I want unused substitutes listed but dimmed and empty, never shown as zeros, so that I do not mistake "did not play" for "did nothing".
12. As a manager, I want the captain marked, so that I can see who wears the armband.
13. As a manager, I want column abbreviations with full names on hover and for screen readers, so that the dense table stays readable.
14. As a manager, I want to sort the stats table by any column and return to squad order, so that I can find the top performer in a column.
15. As a manager, I want the table to say once that it shows only what the match records, so that I understand why there is no passing or tackling column.
16. As a manager, I want an Attacks bar under every match tab with both percentages printed, so that I can see at a glance which side is on top.
17. As a manager, I want the bar to say "No attacks yet" before the first attack, so that an empty match does not read as an even one.
18. As a manager, I want the Statistics tab to count corners, free kicks and penalties, so that I can see set-piece pressure.
19. As a manager, I want the Match tab to show each side's scorers with every minute they scored, so that I can follow the score at a glance.
20. As a manager, I want penalty goals marked "(pen)" and sendings-off listed with the minute, so that I know how goals came and who was lost.
21. As a manager, I want the half-time score shown once half time is reached, and not before, so that the screen never invents a 0-0.
22. As a manager, I want a fixture panel naming the competition, round, date and ground, so that I know the occasion.
23. As a manager, I want the same incidents and fixture panels on the post-match Summary, so that the record survives the final whistle.
24. As a manager, I want a Latest Scores tab during a live match listing the Matchday's other fixtures, with a note that results come in at full time, so that I know which results to expect.
25. As a manager, I want Latest Scores after I accept the result to show every other result on that date, grouped by competition, with penalties where a cup tie had them, so that I can see how my rivals did.
26. As a manager, I want a Report tab in the post-match tab bar, so that I can reach the match report without leaving the match screens.
27. As a manager, I want the Home/Away Stats tab labels to stay the same every match while the heading names the club, so that keyboard shortcuts and muscle memory hold.
28. As a manager, I want the Match Rating to reward assists, key passes and saves, so that a creative midfielder or a busy goalkeeper rates as the match went.
29. As a manager, I want the same Match Rating for the same player on the Ratings tab, the stats table and the Form tab, so that the numbers never disagree.
30. As a manager, I want ratings coloured in three bands with the number always printed, so that a standout performance catches the eye.
31. As a manager, I want every player in every squad-bearing match to get a recorded match line, so that Form works for players at other clubs, not only mine.
32. As a manager, I want a Form tab on any player, so that I can judge his recent performances before selecting, buying or selling him.
33. As a manager, I want the Form tab to list his club's fixtures this season, newest first, with his line in each, so that I can see trends.
34. As a manager, I want "Not selected", "Unused substitute" and "No player record" told apart, so that I know whether he was dropped, benched, or the match was not recorded in detail.
35. As a manager, I want a recently transferred player's Form to start from the day he joined his club, with a Team selector for his previous club this season, so that he is not shown as "Not selected" for matches before he arrived.
36. As a manager, I want a "Form: 7 8 8 7 7" strip of his last five ratings, so that I can read his form at a glance.
37. As a manager, I want season totals per competition (League, Cup, Continental when he has played in one, Overall): appearances as starts (sub), goals, assists, Player of the Match awards, cards, shot accuracy, fouls and average rating, so that I can compare his season across competitions.
38. As a manager, I want a Player of the Match named for each match and marked on the post-match Ratings tab, so that the standout performer is recognised.
39. As a manager, I want to open the match report from a Form row for a match I played, so that I can review the match in detail.
40. As a keyboard user, I want the stats and Form tables to use the same roving focus and sorting keys as every other table, so that I can navigate them without a mouse.

## Implementation Decisions

- The per-player match table shows twelve stream-backed columns, filled by one pure fold of a timeline into a **Match Player Line** per matchday-squad member, cut at a revealed-event count or uncut, and shared by the live table, the post-match table and the stored lines. **Twelve columns, all folded from the stream. The other eight are absent rather than shown as unavailable.** See [Agent Note](../../.agents/notes/proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md).
- The statistics read reports each side's attack share instead of a possession figure, counts corners, free kicks and penalties, and keeps possession as the only unavailable statistic. This part shipped in commit `241584d0`; the persistent Attacks bar does not exist yet. **Corners become counted; the possession proxy is renamed to what it measures, "Attacks", and that share drives the footer bar; possession stays unavailable.** See [Agent Note](../../.agents/notes/proposed/feature/2026-10-03-the-possession-bar-shows-attack-share.md).
- The Match Rating's involvement grows by assists, key passes, saves, fouls and offsides, taken from the Match Player Line, with the weights as named constants in the one rating module. **Yes: the rating adds assists, key passes, saves, fouls and offsides as event weights, read from the same Match Player Line fold; committed matches re-rate on read, by design.** See [Agent Note](../../.agents/notes/proposed/feature/2026-10-03-the-match-rating-reads-recorded-involvement.md).
- A new player-match-lines table, keyed by fixture and player, is written in the Matchday commit transaction for the user's fixture and every squad-bearing AI fixture, holding counts and never a rating; the squad-discard routine deletes its rows; the save schema version changes and old saves are refused. **A new `player_match_lines` table, one row per player per squad-bearing fixture, written in the Matchday's commit transaction for the user's fixture and every AI fixture alike; it stores counts, never a rating.** See [Agent Note](../../.agents/notes/proposed/architecture/2026-10-03-player-match-lines-are-written-at-resolution.md).
- One tab bar serves the match screens; live tabs are Match, Commentary, Statistics, Home Stats, Away Stats, Player Ratings, Latest Scores, Tactics, Substitutions, Opposition and the conditional Live Table; post-match tabs are Summary, Statistics, Home Stats, Away Stats, Player Ratings, Report, Commentary, Latest Scores and the conditional Table. Home and Away Stats are two flat routes over one screen with a side parameter; the player-stats placeholder route is deleted; the post-match "other results" tab keeps its id and is labelled Latest Scores.
- The match header stays above and the Attacks bar is mounted once in the match route shell below, in live and post-match contexts only.
- Match Incidents and the half-time score come from a main-process read, not renderer arithmetic; a penalty goal is a Goal directly preceded by a Penalty event for the same player; red cards are listed as "Sent off". The fixture panel shows competition, round, game date and the home club's stadium and city. Referee, weather and attendance are not shown.
- Latest Scores reads the other fixtures on the user's fixture date; scores appear only after the user's result is accepted, because other fixtures are resolved in the commit transaction.
- The Form tab sits in the player strip after Information. Its rows, form strip, season block, Team selector, transfer-date cut-off and the three non-appearance states follow [the Form tab](issues/09-the-form-tab.md). Player of the Match is the highest Match Rating across both sides at full time, tie-broken by goals, then assists, then the winning side, then player id by code units; it is computed on read and becomes a `CONTEXT.md` term.
- Match lines are public: no knowledge or scouting gate applies to the stats tables or the Form tab.
- Both tables render through the shared data table with the dense data-grid look; one column glossary holds abbreviations and full names; one rating-tone helper maps a rating into three bands (below 6.0, 6.0 to 7.4, 7.5 and above) and is shared by the stats table, the Form tab and the existing ratings view.
- The stale comments and records listed in [ticket 11](issues/11-reconcile-records-found-while-charting.md) are fixed in the change that makes each one stale.

## Testing Decisions

- Good tests observe behaviour at a seam: a fold's output for a constructed timeline, a read's response for a seeded save, a rendered screen's text and roles. They never assert on private helpers.
- **Seam 1, the pure fold** (shared rules package): one test per counting rule (a self-created chance is no key pass, a creator on a saved shot gets a key pass and no assist, a penalty goal counts as a shot, shot on target and goal, a goalkeeper stand-in writes no substitution note, an unused substitute has no counts) and per rating weight. Prior art: the existing match-rating and statistics-aggregation tests.
- **Seam 2, the main-process reads** over a seeded save: per-player stats live-cut and uncut, incidents, half-time score, fixture panel, latest scores, Form rows and season block. Prior art: the statistics and report read tests in the desktop main-process match tests, built on the seeded-save helper.
- **Seam 3, the Matchday commit**: after one commit, every squad member of every squad-bearing fixture has exactly one line; the user's fixture's lines equal the fold of its stored timeline; an AI fixture's lines equal the fold of a re-simulation with the same seed; a failed commit leaves neither results nor lines. Prior art: the committed-timeline tests.
- **Renderer**: component tests for the stats table (dimmed empty unused substitutes, card text alternatives, accessible header names), the Attacks bar (both numbers printed, "No attacks yet"), incidents, and the Form tab's three non-appearance states. Prior art: the match-stats and match-report screen tests.
- **E2E**: one Playwright pass through a live match reaching Home Stats, Away Stats and Latest Scores, and one opening a player's Form tab after a played Matchday, run through pnpm so the bundle is rebuilt.

## Out of Scope

- Action Zones and 2D Pitch: the engine has no spatial model.
- Passes and key headers: needed a possession-chain model the engine lacks. Tackles, headers, interceptions, runs with the ball, fouls suffered and real possession now come from recorded engine events; see [the match-engine-detail map](../match-engine-detail/map.md).
- Referee, weather and attendance: nothing models them, and capacity is not a crowd.
- Live scores from other fixtures: Matchday resolution would have to move out of the commit transaction.
- Non Competitive and International form rows, and Player History (screen 55).
- Backfilling match lines into existing saves.

## Further Notes

- The new per-player and team figures are recorded by the engine in [the match-engine-detail map](../match-engine-detail/map.md), which extends this screen's fold and reads rather than deciding anything new.
- Every map decision was settled without a human in the loop at the user's request, and the user then approved the full set of recommendations on 2026-10-03.
- Rating weights are first guesses; plan a tuning pass after playing several matches with the new table.
