# Agent Note: Match engine — three-phase strength, flat tactical interface, deterministic seed

Status: implemented

> Migrated from ADR-0002 when the numbered ADR layer was retired. Content preserved; cross-references
> repointed at the notes that absorbed the ADRs they named.

## Problem

The match engine needed a resolution model: something concrete to roll against every simulated minute,
a defined interface to tactics, and a randomness story compatible with event sourcing. A single scalar
team rating was the obvious cheap option, and letting tactics reach the engine directly was the obvious
convenient one. Both had to be settled before the minute loop could be written.

## Decision

The engine resolves a match minute-by-minute from each team's Attack/Midfield/Defense **Phase Strength**,
derived from Position Ratings per
[player ratings are derived projections](../../proposed/architecture/2026-08-29-player-ratings-are-derived-projections.md),
rather than a single scalar team rating. A Midfield battle decides each Minute-Slice's possession
winner; the winner's Attack is then rolled against the loser's Defense.

Three phases beat one scalar because the resolution loop needs something to roll against every
simulated minute. A single number collapses every match into the same shape, while three interacting
numbers — mirroring CM03/04's own attack/midfield/defense display — give the loop, and therefore the
commentary, actual texture. A strong-midfield/weak-attack team plays differently than the reverse, at a
small fixed cost.

### The tactics boundary

Tactics (formation, roles, instructions — vocabulary owned by the tactics ticket) never reach the match
engine directly. The engine consumes exactly two shapes:

1. The flat `TacticalModifiers` struct of multipliers and biases (attack, midfield, defense, tempo,
   pressing-aggression), applied to Phase Strength.
2. A phase-slot map: each formation slot resolved once into a position-rating basis, a phase
   (attack/midfield/defense), and a role-fit bump, with the Position and Role vocabulary captured only
   as a per-slot `fit` closure inside that resolution.

Because the engine's runtime carries these resolved slots rather than the Tactic, it can pick an event
participant — who scores, who is booked, who is injured — from the attack phase without ever reading a
formation or role name, and a substitution swaps a slot's player without the engine knowing what the
position or role means.

This is a deliberate boundary: the match engine package has zero knowledge of formations or role names,
so the tactics ticket and any future tactics rework can change that vocabulary freely without touching
the match engine, as long as it still produces the same five numbers plus a phase-slot map with the
same semantics.

### Determinism

The engine is fully deterministic. A single RNG seed, recorded on `MatchStarted`, drives every random
draw inside a match via a splittable PRNG, so the entire event timeline is exactly reproducible from
event history alone. This is a direct consequence of the event-sourced architecture: if the engine
pulled randomness from anywhere but the seed, replaying events wouldn't reproduce the same match, and
events would stop being the source of truth.

### Scope of in-match injury

`Injury` as a Match Event is match-scoped only — it forces an immediate Substitution and carries no
state beyond the final whistle. It is a distinct concept from the season-long fitness and injury
system, which was deferred and unspecified at the time of this decision. The separation was made
explicit so that the presence of in-match injury commentary would not be read as that system already
existing.

## Alternatives considered

- **A single scalar team rating.** Rejected: it gives the minute loop nothing to vary against, so every
  match resolves into the same shape and the commentary has no texture to narrate.
- **Letting the engine read tactics directly** (formations, role names, instructions). Rejected: it
  couples the engine to a vocabulary owned by another part of the system, and every tactics rework would
  then require engine changes.
- **Unseeded randomness.** Rejected outright: incompatible with event sourcing, because replaying the
  event history would not reproduce the match.

## Consequences

- Match outcomes vary with team shape, not just aggregate quality.
- The tactics vocabulary can be reworked without touching `packages/game-engine`.
- Any match is exactly reproducible from its `MatchStarted` seed, which is what makes chunked
  resimulation viable — see
  [domain-bounded deciders and chunked resimulation](2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md).
- Every later mechanic that draws randomness inside a match must consume the same seed stream or it
  breaks replay.
