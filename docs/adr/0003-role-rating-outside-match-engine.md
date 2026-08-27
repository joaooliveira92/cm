# Role Rating computed at tactic-resolution time, not inside the match engine

Role Rating (a player's fit for their assigned Role, weighted against Role Weights — see CONTEXT.md
"Tactics") could have replaced Position Rating as the input to Phase Strength, letting a well-cast
Role directly strengthen a team. We rejected that: ADR-0002 already commits the match engine to zero
knowledge of tactics vocabulary, consuming only the flat `TacticalModifiers` struct. Feeding Role
Rating into Phase Strength would mean the engine reading a tactics-shaped number, breaking that
boundary.

Instead, Role Rating is computed in a `packages/game-engine` step that runs *before* the match engine,
at tactic-resolution time: it compares each starting player's Role Rating against their Position
Rating and folds the delta into `TacticalModifiers` as a small additive bump (capped at ±0.05) on the
relevant phase multiplier. Phase Strength itself stays exactly what ADR-0002 already defined —
Position-Rating-only. This keeps Role fit meaningful without reopening the engine's tactics-blindness.

Formation contributes nothing to `TacticalModifiers` beyond selecting which Positions are filled
(already how Phase Strength varies by shape) — a separate formation-level multiplier would double-
count the same effect through two paths that would need to stay hand-tuned in sync.

Mentality, Tempo, and Pressing map onto `TacticalModifiers` through a fixed multiplier table (e.g.
Attacking mentality: attack ×1.10 / defense ×0.90; High pressing: pressing-aggression ×1.15 and
doubles the Fatigue decay rate from ADR-0002). These tables are `packages/shared` constants, the same
tier as `position_weights` — tunable balance data, not architecture, and can be balance-patched
without a new ADR.

`TacticalModifiers`' `event-odds biases` field is left at `0` for v1: ticket 02 named the field but
never specified which odds it biases or by how much, and that's match-engine-internal mechanics this
ticket has no basis to invent. Wiring Role into event-odds is deferred to a future ticket once ticket
02's event-odds mechanics are specified.
