# 08: How each tactical setting acts on the three-phase engine

Type: grilling
Blocked by: 05, 06, 07

## Question

The match engine stays non-spatial (see [Effort scope and binding decisions](01-effort-scope-and-binding-decisions.md)).
For every formation property, team instruction and player instruction, decide its explicit,
deterministic effect on the existing engine: which Phase Strength, `TacticalModifiers` field, event
probability (fouls, cards, injuries, offsides, shots from distance, crosses), or fatigue it moves,
and in which direction. Settings with no honest phase-based meaning (movement arrows, offside trap
line height) get a documented approximation or no effect, never a pretend coordinate.

Also decide:

- Whether the [Role Rating note](../../../.agents/notes/implemented/architecture/2026-08-27-role-rating-outside-match-engine.md)'s
  boundary holds (the engine reads Position Ratings and precomputed modifiers, never tactics
  directly) or is redrawn.
- How the effects are tested (per-setting directional tests, seeded determinism) and whether any
  new match statistics or commentary templates are needed to make an effect visible.
- Balance numbers are design values tuned here or in a follow-up, not research findings.

Risk: this may be too large for one session. If so, split per instruction family when claimed.
