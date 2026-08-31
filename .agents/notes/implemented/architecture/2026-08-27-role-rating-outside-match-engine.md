# Agent Note: Role Rating is computed at tactic-resolution time, not inside the match engine

Status: implemented

> Migrated from ADR-0003 when the numbered ADR layer was retired.

## Problem

Role Rating — a player's fit for their assigned Role, weighted against Role Weights — could have
replaced Position Rating as the input to Phase Strength, letting a well-cast Role directly strengthen a
team. That is the intuitive design, and it had to be ruled on before Role meant anything mechanically.

## Decision

Role Rating is computed in a `packages/game-engine` step that runs *before* the match engine, at
tactic-resolution time. It compares each starting player's Role Rating against their Position Rating and
folds the delta into `TacticalModifiers` as a small additive bump, capped at ±0.05, on the relevant
phase multiplier. Phase Strength itself stays exactly what
[the match engine note](2026-08-27-match-engine-three-phase-and-deterministic-seed.md) defined:
Position-Rating-only.

Feeding Role Rating into Phase Strength directly would mean the engine reading a tactics-shaped number,
breaking the tactics-blindness that note commits to. Computing it upstream keeps Role fit mechanically
meaningful without reopening that boundary.

### Formation

Formation contributes nothing to `TacticalModifiers` beyond selecting which Positions are filled, which
is already how Phase Strength varies by shape. A separate formation-level multiplier would double-count
the same effect through two paths that would then need to stay hand-tuned in sync.

### Instruction mapping

Mentality, Tempo, and Pressing map onto `TacticalModifiers` through a fixed multiplier table — for
example Attacking mentality gives attack ×1.10 and defense ×0.90; High pressing gives
pressing-aggression ×1.15 and doubles the fatigue decay rate. These tables are `packages/shared`
constants, the same tier as Position Weights: tunable balance data, not architecture, patchable without
a new decision record.

### Deferred

`TacticalModifiers`' event-odds biases field is left at `0`. The field was named before it was specified
— which odds it biases, and by how much, is match-engine-internal mechanics that the originating ticket
had no basis to invent. Wiring Role into event-odds waits until those mechanics are specified.

## Alternatives considered

- **Role Rating replaces Position Rating as the Phase Strength input.** Rejected: it makes the engine
  consume a tactics-derived number, breaking the boundary that lets tactics vocabulary change freely.
- **A formation-level multiplier on top of slot selection.** Rejected as double-counting: shape already
  moves Phase Strength through which Positions are filled, and two paths for one effect need
  hand-tuning to stay consistent.

## Consequences

- Casting a player well in a Role is worth a bounded amount (±0.05 on one phase multiplier), never
  enough to overturn squad quality.
- The match engine stays tactics-blind, so tactics can be reworked independently.
- Instruction and role balance can be patched as `packages/shared` constants without a decision record.
- Role has no influence on event odds until the event-odds mechanics are specified.
