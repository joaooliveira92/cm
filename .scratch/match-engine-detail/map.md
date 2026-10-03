# Map: match engine detail

Label: `wayfinder:map`

> Status: charted 2026-10-03. Nothing resolved yet. Frontier: 01, 04, 05.

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

## Not yet specified

- **Balance re-tune.** If ticket 02 puts any statistic in "simulate a new action", scorelines move and
  a calibration pass is owed; its shape depends on which actions change outcomes.
- **AI-fixture cost.** Whether AI fixtures simulate the full detail or a cheaper path, once ticket 06
  sets the volume.
- **Screen follow-through.** Which columns, statistics and Form figures the match screen gains, and in
  which order, once the events exist; probably a short amendment to that map's spec rather than new
  decisions.

## Out of scope

- A spatial model (Action Zones, 2D Pitch, positions on the pitch): a different engine, not more detail
  on this one.
- Referee, weather and attendance.
- Live scores from other fixtures (Matchday resolution, not the engine).
