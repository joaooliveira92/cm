# 17: Formation, run and suitability effects, and their visibility

Type: grilling
Blocked by: 08
Status: resolved

## Question

Fix, within [the engine framework note](../../../.agents/notes/implemented/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md): how the slot rows feed Phase Strength when a row is crowded or empty, how a
run's in-possession row is weighted, the suitability-cost curve's shape, and which match
statistics (fouls, offsides, chance types, crosses, long shots) and commentary templates the new
events need so every effect is visible to the manager. The agent drafts; the human approves.

## Answer

**Phase Strength = average × coverage factor (normal 4/4/2, diminishing returns), plus width
coverage for crosses; runs count fully in the target row in possession; the suitability factor falls
gently to about 0.9 at 15 and steeply below; new match stats (fouls, offsides, possession, shots by
chance type) and commentary templates (foul, offside, beaten trap, chance types, AI tactical and
formation changes) on the match and post-match screens.** See
[Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-phase-strength-scales-with-coverage.md).
