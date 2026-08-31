# Agent Note: Contact injury is modeled as a defensive duel on each minute's possession battle

Status: implemented

> Migrated from ADR-0009 when the numbered ADR layer was retired.

## Problem

Contact injuries need a concrete physical-duel or collision moment in the match engine to key off. The
engine has no duel concept: each Minute-Slice decides which team holds possession via the Midfield
battle, then rolls that side's Attack against the other's Defense for an event. Which engine moment
counts as a contact event, how defender Aggression and hard pressing factor in, and how the collision
check sits inside the existing loop without a new simulation layer all had to be decided together.

## Decision

A **duel** is the possession contest itself plus the attacking resolution, inside a Minute-Slice. No new
simulation layer. Each slice:

1. With probability `duelChance = DUEL_CHECK_BASE × attacker.tempo × defender.pressingAggression`,
   clamped to `[0,1]`, the minute's play is considered to include a physical duel. Pressing and Tempo
   therefore scale the *frequency* of collision checks, matching the dirty-football-era feel — a
   hard-pressing, fast-tempo side concedes more contact opportunities.
2. When a duel is drawn, the defender's challenge rolls a collision check against the ball carrier:
   `risk = BASE_COLLISION × (defender Aggression / attacker Bravery) × (attacker Injury Proneness / 10)`.
   A hit produces a contact `Injury` routed through the shared severity pipeline
   (`rollInjury("contact", …)`), which leans structural — broken toe, twisted ankle, dead leg.

Constants live in `packages/game-engine/src/match/simulate.ts` (`DUEL_CHECK_BASE = 0.06`,
`BASE_COLLISION = 0.05`), the same tunable-balance tier as the instruction multiplier tables, so they can
be patched without a decision record.

### Two new attributes, deliberately rating-invisible

The engine needed two attributes the player model had not carried: `bravery` and `aggression`, both
Mental, 1–20. They are added to `OUTFIELD_ATTRIBUTES` but deliberately absent from every
`POSITION_WEIGHTS` table, so they never affect Position Rating, Overall Rating, or Transfer Value — the
same treatment the fitness and injury attributes get.

## Alternatives considered

- **A separate duel simulation layer** with its own per-tackle and per-aerial resolution. Rejected: it
  adds event-loop state and granularity out of scope for v1, when the existing possession contest already
  provides a physically meaningful moment.
- **Including Bravery and Aggression in Position Weights.** Rejected: they would then move Overall Rating
  and Transfer Value, making injury-model attributes leak into the economy.

## Consequences

- No new simulation layer, and no additional event-loop state beyond the condition ledger already
  tracked.
- Contact injuries are rarer than non-contact fatigue injuries across a match, since contact is bounded
  by how often a duel is drawn and won by an aggressive defender. This reads as physically plausible.
- The collision check consumes the shared seed stream, so the match stays deterministic from the
  `MatchStarted` seed — see
  [the match engine note](../architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md).
- The duel is deliberately coarse: at most one per slice, aggregated across the phase battle. It does not
  model individual tackles or aerials.
