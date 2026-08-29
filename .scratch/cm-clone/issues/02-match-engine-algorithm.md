# Match engine resolution algorithm

Type: grilling
Status: resolved

Blocked by: 01

## Question

What is the shape of the match simulation algorithm? Decide: how player attributes (from the ticket
"Player attribute model & data schema") combine into team strength, how tactics (formation, roles,
instructions) modulate that strength, the resolution loop that turns team strengths into a scoreline
plus a timeline of key events (goals, cards, injuries, substitutions), and what event vocabulary the
engine emits (these become the commands/events the event-sourced game-engine package deals in for a
match day). This is the single riskiest design decision in the project — treat it as its own focused
session, not a quick call.

## Answer

Resolved via a grilling + domain-modeling session. Canonical vocabulary recorded in
[CONTEXT.md](../../../CONTEXT.md) under "Match engine"; architecture rationale in
[ADR-0002](../../../docs/adr/0002-three-phase-match-strength-and-deterministic-seed.md).

**Resolution loop**: Discrete Minute-Slices, one per simulated minute across 90, plus a Stoppage
Slice per half (1–5 simulated minutes, length biased upward by that half's count of stoppage-causing
events).

**Team strength**: Three Phase Strengths per team — Attack, Midfield, Defense — each a weighted
average of Position Ratings (ADR-0001) for the players occupying that phase's Positions (Defense:
GK/DC/DL/DR; Midfield: DM/MC/ML/MR; Attack: AMC/ST), computed pre-tactics. Each Minute-Slice: a
Midfield battle decides the slice's possession winner; the winner's Attack rolls against the loser's
Defense to decide whether a notable event fires.

**Tactics interface**: Tactics (ticket 03's vocabulary, not invented here) resolve into a flat
`TacticalModifiers` struct — attack/midfield/defense/tempo/pressing-aggression multipliers and event-
odds biases — applied to Phase Strength. The match engine has zero knowledge of formations, roles, or
instructions themselves; it only ever consumes this flat struct.

**Home advantage**: Flat ~+5-10% multiplier on all three home-team Phase Strengths, applied before
Tactical Modifiers.

**Fatigue**: From minute ~60, Midfield and Defense Phase Strength decay a few percent per 15 minutes,
scaled inversely by squad-average Stamina. Resets every match — no persistent cross-match fitness
state (deferred, out-of-fog system).

**Mid-match commands**: The decider accepts `ChangeTactics` and `MakeSubstitution` mid-match. Subs:
5 total per team across a maximum of 3 windows (halftime doesn't count as a window). No extra-
time/penalties in v1 (no cup yet).

**Match Event vocabulary** (v1): `MatchStarted` (carries the RNG seed), `Goal`, `ShotOnTarget`,
`ShotMissed`, `BigChance`, `YellowCard`, `RedCard`, `Injury` (match-scoped only — forces an immediate
sub, no persistent effect; distinct from the deferred season-long fitness/injury system),
`Substitution`, `HalfTimeReached`, `FullTimeWhistle`.

**Determinism**: Fully deterministic from a single seed recorded on `MatchStarted`; all in-match
randomness derives from it (splittable PRNG), so the event timeline is exactly reproducible from
event history alone.

