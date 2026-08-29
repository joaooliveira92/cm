Type: grilling
Status: resolved
Blocked by: 01

## Answer

Resolved via grilling + domain-modeling.

- **Bias shape**: Multiplicative. The focused Category's seasonal growth fraction (the ~65%
  gap-closing step from Player Development) is multiplied by a single named tuning constant (e.g.
  ×1.5) in `packages/shared`. The existing fraction-of-gap ceiling clamp already prevents overshoot.
  Additive "bonus points" was rejected: Player Development's unit is a fraction of gap, not a point
  count.
- **Unfocused state**: No-focus is a real, distinct fourth state and the default on generation. Gives
  "unfocused player" a concrete meaning as the baseline the bias is relative to, and matches CONTEXT.md's
  "defaults to none/balanced."
- **Tradeoff**: Purely additive, no downside to the other three Categories. A focus concentrates growth
  without taking from elsewhere. Keeps AI-club parity trivial (unmodified development = no focus).
- **Timing/command/Decider**: Changeable any point, no season-boundary or between-match restriction.
  Command `SetTrainingFocus` targets the Club Decider (same one Player Development owns), whose per-club
  stream already holds player-scoped state.
- **Backfill**: None. A missing Training Focus record reads as the no-focus default at read-time; a write
  happens only when the manager sets a focus. No schema migration.
- **Event shape**: Its own persisted event `TrainingFocusSet` on the Club Decider stream, distinct from
  `PlayerDeveloped` (the per-season development outcome carrying Attributes, vs. a between-season state
  change). `SetTrainingFocus` is a real player-invokable command via the RpcGroup. `PlayerDeveloped`
  carries no focus payload — the Club Decider reads the player's current stored focus when folding
  development.

## Question

Design **Training Focus**: a per-player, per-Category (Technical/Mental/Physical/Goalkeeping)
assignment a manager sets, biasing how much of a season's Player Development a player's Attributes in
that Category receive, relative to an unfocused player. Human-managed clubs only; AI clubs' players
always use unmodified Player Development (see [map.md](../map.md) Out of scope).

Resolve, at minimum:

- The numeric shape of the bias: flat additive bonus to that Category's growth, a multiplier on it,
  or something else — and whether it's capped.
- What "unfocused"/default looks like: is no-focus a real fourth state distinct from focusing on one
  Category, or does every player always have exactly one Category focused (defaulting to one on
  generation)?
- Whether focusing one Category imposes any tradeoff on the others (e.g. a zero-sum redistribution
  across Categories) or is purely additive with no downside to the other three.
- How often a manager can change a player's Training Focus (any point, only between matches, only at
  season boundaries) and what Command carries it (e.g. `SetTrainingFocus`) — confirm which Decider it
  targets (likely the same one [Player Development curve](01-player-development-curve.md) settled on).
- Existing-save / already-generated players: since Training Focus is new state, does a pre-existing
  player row need a migration/backfill, or is a missing value read as the settled default at
  read-time with no schema migration required?
- Whether Training Focus needs its own persisted Event (e.g. `TrainingFocusSet`) distinct from
  `PlayerDeveloped`, or is folded into the same event stream.

This ticket assumes [Player Development curve](01-player-development-curve.md)'s answer (curve shape,
Decider, event shape) as a given; if resolving this ticket reveals that answer needs to change, reopen
that ticket rather than deciding around it here.
