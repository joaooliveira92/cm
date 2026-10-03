# Rating weights for the new involvement

Type: grilling
Status: resolved
Blocked by: 02, 05

## Question

Once tackles, headers, interceptions, passes and fouls suffered are recorded, which enter the Match
Rating, with what default weights, and are completion rates weighted as rates or counts? A defender's
rating today leans on goals conceded while on; how much of that proxy does recorded defending replace?
Builds on [the Match Rating reads recorded involvement](../../../.agents/notes/proposed/feature/2026-10-03-the-match-rating-reads-recorded-involvement.md).

## Answer

**Tackles won, interceptions and headers won enter the rating at small weights; fouls suffered at a
smaller one; a header lost and the derived tackles-attempted do not; the defence phase's goals-against
share drops from -0.4 to -0.3.**

Default weights, added to `MATCH_RATING_EVENT_WEIGHTS` beside those set by
[the Match Rating reads recorded involvement](../../../.agents/notes/proposed/feature/2026-10-03-the-match-rating-reads-recorded-involvement.md):

| Involvement | Weight | Reasoning |
|---|---|---|
| Tackle won | +0.10 | At the researched 1.7–2.8 per full-90 starter, a typical defender or midfielder gains about +0.2–0.3 |
| Interception | +0.10 | Same scale as a tackle won |
| Header won | +0.05 | Headers are rarer here than in real football (only crosses and corners produce them), so a duel won is worth noting, not decisive |
| Fouled | +0.03 | Drawing fouls is a small positive; the fouler already loses 0.05 |

- **Counts, not rates.** Completion rates would need attempts the engine does not decide (passes), and a
  tackle "attempt" is derived from fouls; weighting counts keeps every input a recorded event.
- **No weight for a header lost or a tackle attempt:** losing a duel the attribution pass assigned is
  the least reliable fact in the line, and a failed tackle is already the foul's -0.05.
- **The defensive proxy shrinks, not disappears.** `MATCH_RATING_GOAL_AGAINST_SHARE.defense` goes from
  -0.4 to -0.3: recorded defending now carries part of what the goals-conceded proxy stood in for, but
  attribution is a weighted distribution, not proof of who failed, so the result still dominates.
- Balance numbers, tuned by play; the rating module stays their only home. No separate note: this is a
  tuning of the structure the cited note already fixes.
