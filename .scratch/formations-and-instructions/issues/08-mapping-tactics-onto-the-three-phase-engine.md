# 08: How each tactical setting acts on the three-phase engine

Type: grilling
Blocked by: 05, 06, 07
Status: resolved
Also waits on: [player-positional-model ticket 04](../../player-positional-model/issues/04-free-role.md) (the Free Role rating)

## Question

The match engine stays non-spatial (see [Effort scope and binding decisions](01-effort-scope-and-binding-decisions.md)).
For every formation property, team instruction and player instruction, decide its explicit,
deterministic effect on the existing engine: which Phase Strength, `TacticalModifiers` field, event
probability (fouls, cards, injuries, offsides, shots from distance, crosses), or fatigue it moves,
and in which direction. Settings with no honest phase-based meaning (movement arrows, offside trap
line height) get a documented approximation or no effect, never a pretend coordinate.

Also decide:

- The match cost of poor slot suitability, reading the suitability rule from
  [player-positional-model ticket 07](../../player-positional-model/issues/07-slot-suitability-and-familiarity-tier.md)
  (CM 01/02 cut tactical attributes below 20, scaled by Versatility).
- Whether a run shifts part of a player's contribution to its target row's phase.

- Whether the [Role Rating note](../../../.agents/notes/implemented/architecture/2026-08-27-role-rating-outside-match-engine.md)'s
  boundary holds (the engine reads Position Ratings and precomputed modifiers, never tactics
  directly) or is redrawn.
- How the effects are tested (per-setting directional tests, seeded determinism) and whether any
  new match statistics or commentary templates are needed to make an effect visible.
- Balance numbers are design values tuned here or in a follow-up, not research findings.

Risk: this may be too large for one session. If so, split per instruction family when claimed.

## Answer

**A chance pipeline inside the three-phase engine (possession, attempt, chance type, weighted
creator and finisher, attribute-based outcome), new Foul and Offside events, a resolution step that
turns the Tactic into team modifiers and per-slot behaviour vectors the engine consumes as numbers,
a suitability cost that scales decision-making and positional attributes, runs that count in the
target cell in possession, closest-attribute mappings, and a tuning table proved by directional
tests and a calibration harness.** The per-setting effect tables are tickets 15, 16 and 17. See
[Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).
