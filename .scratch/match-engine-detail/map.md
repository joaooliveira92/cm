# Map: match engine detail

Label: `wayfinder:map`

> Status: complete 2026-10-03, every ticket resolved autonomously at the user's approval. Nothing is
> left to decide. [Spec published](spec.md); implementation tickets 12–19 sliced under
> [issues/](issues/). Tickets 12–17 and 19 are resolved (the fold, rating, stored-timeline decode,
> silent commentary, statistics read, player match lines and docs all shipped). 18 remains: the
> match-screen line-table ticket it extends shipped 2026-10-04, so 17's nullable count columns went
> into that table and its read-side check resolved against it; 18 is still blocked on the Form tickets
> ([match-screen 19](../match-screen-cm-layout/issues/19-form-tab-recent-games.md) and
> [20](../match-screen-cm-layout/issues/20-form-season-block-and-player-of-the-match.md)).

## Destination

A spec for changing the match engine so it records, per player, the actions the CM 03/04 columns show
and the [match screen map](../match-screen-cm-layout/map.md) left out: passes and completions, tackles
and tackles won, headers and headers won, interceptions, fouls suffered, and possession. When this map
is done, every one of those is either backed by a recorded Match Event with a stated cost (seed,
balance, timeline size, commentary) or ruled out with a reason.

## Notes

- Domain: `packages/game-engine` match simulation, its stored timelines in the desktop main process,
  and the stats fold from [the match player line folds only recorded events](../../.agents/notes/proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md).
- Two facts found while charting shape the route. The engine already decides possession every
  minute-slice and discards it. And it defends as an *average* of the defence, so no defender is
  ever named, which is why there is no tackle or block to credit.
- Standing rules: [the match model shows only what it produces](../../.agents/notes/implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md);
  committed matches keep their timeline, so engine changes only affect new matches.
- Skills: `effect-code` is irrelevant to the pure engine; `grilling` and `domain-modeling` for the
  grilling tickets; `research` for 01 and 05.

## Decisions so far

- [What the engine rolls but does not record](issues/01-what-the-engine-rolls-but-does-not-record.md):
  possession per slice, failed-attack slices, contact duels and cross finishers are decided and
  discarded; no defender, fouled player or pass is ever decided.
- [Record what is rolled, or simulate new actions?](issues/02-record-or-simulate.md): record and
  attribute decided facts only; passes, completion and key headers ruled out.
- [Attribution without moving the seed](issues/03-attribution-without-moving-the-seed.md): a second
  random stream from the match seed, appended after the slice; results byte-identical.
- [Recording possession](issues/04-recording-possession.md): share of minute-slices with the ball, as
  a cumulative tally event; it takes the bottom bar.
- [Typical per-match figures to calibrate against](issues/05-cm-calibration-figures.md): Opta and
  StatsBomb ranges recorded in the calibration research; CM 03/04 figures are feel, not targets.
- [Event volume: individual events or tallies?](issues/06-event-volume-and-the-timeline.md):
  individual events; baseline 59.8 events / 6.7 KB per match, budget ≤ 3× events and +25% commit time.
- [Naming the fouled player](issues/07-naming-the-fouled-player.md): a side-in-possession player
  picked on the attribution stream, as a field on `Foul`; takers unchanged.
- [Commentary and the reveal for new events](issues/08-commentary-for-new-events.md): silent lines
  keep the one-line-per-event invariant the live cut depends on.
- [Rating weights for the new involvement](issues/09-rating-weights-for-new-involvement.md): tackle
  won and interception +0.10, header won +0.05, fouled +0.03; defence goals-against share -0.4 → -0.3.
- [Saves, stored timelines and matches in progress](issues/10-saves-and-in-progress-matches.md):
  nothing restarts; the stored-timeline union must gain the new kinds; old matches read "-".
- [Screen follow-through](issues/11-screen-follow-through.md): new columns and rows extend the
  match-screen fold after its tickets 12 and 18.
- [player_match_lines gain the new counts](issues/17-player-match-lines.md): the nullable
  recorded-defending columns shipped with match-screen 18; a pre-change timeline stores NULL and
  reads "-", proven by the read-back test.

## Not yet specified

None. Balance cleared to Out of scope (02 changes no outcome), AI-fixture cost settled in 06, screen
follow-through graduated to 11.

## Out of scope

- **Re-calibrating goals and fouls.** No decision here changes an outcome. The engine test fixtures
  measure 4.2 goals and 3.6 fouls per match against `calibrate.test.ts` targets of 2.5–2.8 and 20–26
  ([06](issues/06-event-volume-and-the-timeline.md)); that gap predates this map and is its own
  balance effort. Until it is closed, fouls suffered will be small.
- **Passes, completion and key headers** — nothing decides a pass; returns only with a possession-chain
  model ([02](issues/02-record-or-simulate.md)).

- A spatial model (Action Zones, 2D Pitch, positions on the pitch): a different engine, not more detail
  on this one.
- Referee, weather and attendance.
- Live scores from other fixtures (Matchday resolution, not the engine).
