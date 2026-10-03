# Agent Note: The engine records decided facts, not new actions

Status: proposed

Extends [the match model shows only what it produces](../../implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)
from screens to the engine: that note forbids a screen inventing what the stream lacks; this one says
which new facts the stream may gain. Related: [attribution draws from its own stream](../architecture/2026-10-03-attribution-draws-from-its-own-stream.md),
which is how the attributed facts below avoid changing results.

## Problem

The CM 03/04 per-player columns want passes, completions, tackles, headers, interceptions and fouls
suffered, plus team possession. The engine records none of these. Each can be added in one of three
ways: (a) record a fact the engine already decides and discards; (b) attribute an already-decided
team-level fact to a named player; (c) simulate a new action that can change what happens next. Option
(c) moves scorelines and needs a balance pass; (a) changes only the timeline; (b) adds a modelling
choice (who gets the credit) with no effect on play. Without a rule, each statistic gets argued
separately and a column of invented numbers slips in because it looks like CM.

## Proposal

**A statistic is recorded only when the engine decided the fact behind it. Recording (a) and
attribution (b) are allowed; new simulated actions (c) are not part of this effort.** Attribution is
honest because the fact is real (the side did lose the ball, the cross was headed); only the name on
it is a weighted pick, and that pick never feeds back into play.

| Statistic | Kind | Fact behind it |
|---|---|---|
| Possession | (a) | The per-slice possession roll |
| Run | (a) | The creator of a `RunWithBall` chance, already recorded; counted by the player-line fold, no engine change |
| Tackles won, interceptions | (b) | A slice where the side in possession creates no attack: the defence won the ball. One defending player is credited, typed tackle or interception by his tackling against his positioning and anticipation. Not every such slice is credited: a credit rate tuned to the calibration targets decides, so totals land in a realistic range |
| Tackles attempted | derived | Tackles won plus fouls committed: a foul is a failed tackle. No separate event |
| Headers attempted / won | (a) + (b) | The attacker's header is already decided: commentary's `shotKindFor` classifies a shot as a header (a cross chance, or a corner not played short to the edge of the area or flicked on). That classifier moves out of commentary into one engine rule read by both commentary and the attribution pass, which emits a `HeaderDuel` the header shooter wins (he got the shot). The defender credited as challenging him loses it (b). A cross or saved shot that produces a corner credits a defending player with a won defensive header (b) |
| Fouls suffered | (b) | Every foul is rolled against the side out of possession, so the victim is a player of the side in possession, credited on the `Foul` event |

**Ruled out:** passes, pass completion and key headers. Nothing in the engine decides a pass; any count
would be generated from attributes with no event behind it, which the standing rule forbids. They
return only with a possession-chain model, which is a different engine granularity, like the spatial
model behind Action Zones.

**"Decorative but recorded" is acceptable for (b)** — a credited tackle changes nothing downstream —
because the team-level fact did happen and decided the match; what the old rule rejected was numbers
with no decision behind them at all.

## Alternatives considered

**Simulate tackles and interceptions as actions that end attacks (c).** Rejected for this effort: the
engine already ends attacks through the `eventProbability` roll, so a second mechanism would double-count
defending and force a full re-balance of goals, cards and fouls against `calibrate.test.ts`.

**Generate passes from possession and the passing attribute.** Rejected: it is the invented-figure case
exactly. A midfielder's "62 passes, 88%" would be a function of his attribute, not of the match.

**Credit every breakdown slice.** Rejected: about 75 per match, against real totals of roughly half
that for tackles and interceptions combined; the credit rate is the honest dial because the uncredited
breakdowns are still real, just not individually named.

## Acceptance criteria

- No new event changes a scoreline, card, injury or set piece for any seed (proved under the attribution
  note's test).
- Every new per-player figure traces to a team-level fact in the same slice.
- No pass or completion figure exists anywhere.
- Calibration asserts tackles, interceptions, headers and fouls suffered fall in the researched ranges.

## Risks

- Credited tackles and interceptions are a distribution, not a record of who really made them. A
  defender's tally reflects his attributes and minutes more than any single match. Accepted, and the
  reason they get low rating weights.
- Headers will run far below real football (27–44 aerial duels per team-match in the
  [calibration research](../../../../docs/research/match-engine-calibration-figures.md)), because only
  crosses and set pieces decide a header here. Accepted: inflating them would be the invented-figure
  case. Calibration asserts tackles and interceptions against the real ranges, and headers only against
  this engine's own cross and corner volume.
- The CM table stays without its most familiar columns (Pas, Cmp). Accepted until a possession-chain
  model exists.
