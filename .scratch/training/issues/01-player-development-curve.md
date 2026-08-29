Type: grilling
Status: resolved

## Answer

Resolved via grilling + domain-modeling. Canonical vocabulary in [CONTEXT.md](../../../CONTEXT.md);
architecture rationale in [ADR-0011](../../../docs/adr/0011-deterministic-fractional-player-development.md).

- **Curve**: Reuse the existing `attributeCeilingOn20Scale` (generation.ts) as the per-season
  ceiling each Attribute moves toward — linear 16→23 ramp toward PA, plateau 24–29, Physical-only
  decline ~1.5/season past 30. CONTEXT.md's "climbing fastest in a player's early 20s" wording
  softened to match the actual linear ramp.
- **Category variance**: Uniform growth across all four Categories. The only Category divergence is
  Physical-only decline past 30 (already in the curve). Goalkeeping follows the same rule for keepers.
- **Determinism**: Fully deterministic, no RNG, no seed — a pure function of (current Attribute, age,
  PA, ceiling). Differs from the match engine's seeded design (ADR-0002) because nothing here draws
  randomness. Trivially replayable from event history.
- **Approach/clamp**: Each Attribute moves a fixed fraction (~65%) of the remaining gap to the current
  age-ceiling each season, then rounds. Self-clamps (never overshoots); decline handled uniformly as a
  falling ceiling. Fraction is a named tuning constant in `packages/shared`.
- **Decider/Event/trigger**: owned by the Club Decider (per-club stream already holds player-scoped
  state), triggered off `SeasonConcluded` via the existing cross-Decider reactor (ADR-0007), emitting a
  new `PlayerDeveloped` event per club carrying the updated Attribute set.
- **ADR-0001 impact**: none — only Attribute values are written; Position Rating / Overall / Transfer
  Value stay computed on read.
- **Hidden attributes** (Injury Proneness etc.): develop identically via the same ceiling + fraction, so
  they don't silently diverge.

## Question

Design **Player Development**: the per-season step where a player's Attributes move toward their
hidden Potential Ability, shaped by age. This mechanism is described in [CONTEXT.md](../../../CONTEXT.md)
(the Potential Ability and Player Development entries) but has never been implemented — there is no
existing growth-rate concept, formula, or age-curve code to build on (confirmed by code search: the
only current uses of `potentialAbility` are one-time player generation and transfer-value pricing).

Resolve, at minimum:

- The exact age-curve shape: which age bands grow, which plateau, which decline, and by how much
  per season (e.g. is decline symmetric with growth, or steeper/shallower).
- Whether the rate/shape varies per Category (Technical/Mental/Physical/Goalkeeping) or is uniform
  across all four for a given player.
- Whether growth is deterministic (same inputs always produce the same delta) or has randomness —
  note the cm-clone match engine ([Match engine resolution algorithm](../../cm-clone/issues/02-match-engine-algorithm.md))
  set a precedent of full determinism from a seed; consider whether Player Development should follow
  suit.
- How a player's current Attributes clamp against Potential Ability (what happens when Attributes
  reach the ceiling — do they simply stop moving, or is there some soft asymptotic approach).
- Where this runs in the event-sourced architecture: which Decider owns it (the Club Decider looks
  right, per [Draft the Effect RPC contract & event-sourcing schema](../../cm-clone/issues/07-rpc-contract-schema.md)'s
  precedent of per-club streams owning player-scoped state, but confirm), what new Event(s) it
  produces (e.g. `PlayerDeveloped`), and that it's triggered off `SeasonConcluded`.
- Whether Overall Rating / Transfer Value's existing "derived, computed on read, never stored" model
  (ADR-0001) needs any change, or whether Player Development just writes new Attribute values and
  those formulas keep working unmodified.

This ticket does **not** decide Training Focus's bias mechanic — that's
[Training Focus mechanics and data model](02-training-focus-mechanics.md), blocked by this one.
