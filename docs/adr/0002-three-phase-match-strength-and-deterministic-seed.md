# Match engine: three-phase strength, flat tactical interface, deterministic seed

The match engine resolves a match minute-by-minute from each team's Attack/Midfield/Defense Phase
Strength (derived from Position Ratings per ADR-0001), rather than a single scalar team rating. A
Midfield battle decides each Minute-Slice's possession winner; the winner's Attack is then rolled
against the loser's Defense. We chose three phases over one scalar because the resolution loop needs
something to roll against every simulated minute — a single number collapses every match into the
same shape, while three interacting numbers (mirroring CM03/04's own attack/midfield/defense display)
gives the loop, and therefore the commentary, actual texture (a strong-midfield/weak-attack team
plays differently than the reverse) at a small, fixed cost.

Tactics (formation, roles, instructions — vocabulary owned by the tactics ticket) never reach the
match engine directly. The engine consumes exactly two shapes. First, the flat `TacticalModifiers`
struct of multipliers/biases (attack, midfield, defense, tempo, pressing-aggression) applied to Phase
Strength. Second, a phase-slot map: each formation slot resolved once into a
position-rating basis, a phase (attack/midfield/defense), and a role-fit bump, with the Position and
Role vocabulary captured only as a per-slot `fit` closure inside that resolution. Because the engine's
runtime carries these resolved slots, not the Tactic, it can pick an event participant (who scores,
who is booked, who is injured) from the attack phase without ever reading a formation or role name,
and a substitution swaps a slot's player without the engine knowing what the position or role means.
This is a deliberate boundary: the match engine package has zero knowledge of formations or role
names, so the tactics ticket (and any future tactics rework) can change that vocabulary freely
without touching the match engine, as long as it still produces the same five numbers plus a
phase-slot map with the same semantics.

The engine is fully deterministic: a single RNG seed, recorded on `MatchStarted`, drives every random
draw inside a match (via a splittable PRNG), so the entire event timeline is exactly reproducible from
event history alone. This is a direct consequence of the event-sourced architecture — if the engine
pulled randomness from anywhere but the seed, replaying events wouldn't reproduce the same match, and
events would stop being the source of truth.

`Injury` as a Match Event is match-scoped only (forces an immediate Substitution, no state beyond the
final whistle) and is a distinct concept from the deferred, not-yet-specified season-long
fitness/injury system. We didn't want the presence of in-match injury commentary to be read as that
system already existing.
