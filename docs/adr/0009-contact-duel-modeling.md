# Contact injury modeled as a defensive duel on each minute's possession battle

## Context

Path A contact injuries (ticket 05) need a concrete "physical duel / collision" moment in the match
engine to key off. The engine (ADR-0002/0003) has no duel concept: each Minute-Slice decides which
team holds possession via the Midfield battle, then rolls that side's Attack against the other's
Defense for an event. We had to decide which engine moment counts as a contact event, how defender
Aggression and hard pressing factor in, and how the collision check sits inside the existing loop
without a new simulation layer.

## Decision

A **duel** is the possession contest itself, plus the attacking resolution, inside a Minute-Slice —
no new simulation layer. Each slice:

1. With probability `duelChance = DUEL_CHECK_BASE × attacker.tempo × defender.pressingAggression`
   (clamped to `[0,1]`), the minute's play is considered to include a physical duel. The Pressing
   instruction and Tempo therefore scale the *frequency* of collision checks, matching the "dirty
   football" era feel — a hard-pressing, fast-tempo side concedes more contact opportunities.
2. When a duel is drawn, the defender's challenge rolls a collision check against the ball carrier:
   `risk = BASE_COLLISION × (defender Aggression / attacker Bravery) × (attacker Injury Proneness / 10)`.
   A hit produces a contact `Injury` routed through ticket 03's shared severity pipeline
   (`rollInjury("contact", …)`), which leans structural (broken toe, twisted ankle, dead leg).

Constants live in `packages/game-engine/src/match/simulate.ts` (`DUEL_CHECK_BASE = 0.06`,
`BASE_COLLISION = 0.05`) — the same tunable-balance tier as ADR-0003's multiplier tables, so they can
be patched without a new ADR.

The engine needed two attributes that the player model had not yet carried: `bravery` and
`aggression` (both Mental, 1-20). They're added to `OUTFIELD_ATTRIBUTES` but deliberately absent from
every `POSITION_WEIGHTS` table so they never affect Position/Overall Rating or Transfer Value — the
same treatment the fitness/injury attributes get.

## Consequences

- No new simulation layer, no additional event-loop state beyond the condition ledger already tracked
  for ticket 02.
- Contact injuries are rarer than non-contact fatigue injuries across a match (contact is bounded by
  how often a duel is drawn and won by an aggressive defender), which reads as physically plausible.
- Because the collision check consumes the shared seed stream, the whole match stays deterministic
  from the `MatchStarted` seed (ADR-0002).
- The duel is deliberately coarse (one per slice at most, aggregated across the phase battle). It does
  not model individual tackles/aerials; that granularity is out of scope for v1.