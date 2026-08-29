# Tactics model detail: formations, roles, team instructions

Type: grilling
Status: resolved

Blocked by: 01

## Question

Lock the concrete v1 tactics vocabulary: the fixed set of selectable formations (e.g. 4-4-2, 4-3-3,
3-5-2 — which ones ship in v1), the named player roles per position (CM03/04 had ~10-15, e.g.
sweeper, playmaker, poacher — decide the v1 list and what attributes from the "Player attribute
model" ticket each role weights), and the small set of team-wide instruction sliders (tempo,
mentality, pressing, etc. — decide the exact list and their effect direction). This feeds directly
into how the match engine (ticket 02) turns tactics into team strength.

## Answer

Resolved via a grilling + domain-modeling session. Canonical vocabulary recorded in
[CONTEXT.md](../../../CONTEXT.md) under "Tactics"; architecture rationale in
[ADR-0003](../../../docs/adr/0003-role-rating-outside-match-engine.md).

**Formations** (5, v1): 4-4-2, 4-3-3, 4-5-1, 3-5-2, 5-3-2 — each a fixed multiset of 10 outfield
Position slots (existing taxonomy, no new positions) + implicit GK. Purely structural: determines
which Positions are filled, and therefore which players feed each Phase Strength (ADR-0002). No
formation-level multiplier — would double-count what Phase Strength composition already captures.

**Roles** (8, one per Position, v1): Goalkeeper, Ball-Playing Defender (DC), Wing-Back (DL/DR),
Anchorman (DM), Playmaker (MC), Winger (ML/MR), Attacking Midfielder (AMC), Poacher (ST). Chosen per
formation-slot at tactic-set time, not a saved player property. Each has a Role Weights profile
(parallel to Position Weight) skewed toward 2-3 attributes; Role Rating (parallel to Position Rating)
is derived from it.

**Role Rating vs. the match engine**: computed at tactic-resolution time in `packages/game-engine`,
*before* the match engine runs — never inside it, preserving the match engine's zero-knowledge-of-
tactics invariant (ADR-0002). Role Rating vs. Position Rating delta feeds `TacticalModifiers` as a
small additive bump (±0.05 cap), never replaces Position Rating in Phase Strength.

**Team Instructions** (3 sliders, each 3-state): Mentality (defensive/balanced/attacking — shifts
attack/defense multiplier balance), Tempo (slow/normal/fast — maps to the `tempo` field), Pressing
(low/medium/high — maps to `pressing-aggression` and scales the Fatigue decay rate from ADR-0002).
Fixed multiplier table locked as tunable `packages/shared` constants (ADR-0003), same tier as
`position_weights`.

**Tactic** (persisted shape, `ChangeTactics` payload): `{ formation, slots: { position, role,
playerId }[11], mentality, tempo, pressing }`. No separate `TacticSelected` event — `ChangeTactics`
(already named in ticket 02) is the single command/event shape.

**Event-odds biases** on `TacticalModifiers`: left at `0` for v1 — ticket 02 named the field but never
specified the mechanics it biases. Flagged in the map's Not yet specified as a follow-up once ticket
02's event-odds mechanics are specified.
