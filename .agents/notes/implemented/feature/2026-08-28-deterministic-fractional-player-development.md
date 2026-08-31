# Agent Note: Player Development is a deterministic fraction-of-gap step toward the reused generation ceiling

Status: implemented

> Migrated from ADR-0011 when the numbered ADR layer was retired.

## Problem

Player Development — the per-`SeasonConcluded` step that moves Attributes toward Potential Ability —
needed a curve and a randomness policy. The match engine had already chosen seeded randomness, so
development defaulting to the same choice was the path of least resistance and had to be examined rather
than assumed.

## Decision

Player Development is fully deterministic: no RNG, and therefore no seed. Each Attribute moves a fixed
fraction of the remaining gap toward the age-dependent ceiling each season.

That ceiling is the *same* `attributeCeilingOn20Scale` function Player generation already uses, which
encodes growth through youth (a linear 16→23 ramp toward Potential Ability), a plateau through the prime
(24–29), and Physical-only decline past 30.

Determinism is right here even though
[the match engine](../architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md) chose
seeded randomness, because the two jobs differ. A match needs per-minute texture, so it draws from a
seed. Player Development's annual delta is a smooth function and draws nothing, so a seed would be dead
weight — the result is trivially replayable from event history without one.

### Reusing the generation curve

Reusing the generation ceiling rather than writing a new curve means the ceiling a young player is
generated toward is exactly the ceiling they grow toward each season: one curve, not two that can drift
apart.

The four Categories grow uniformly. The only Category divergence is that Physical Attributes decline past
30 while Technical and Mental hold. Hidden attributes such as Injury Proneness develop identically, so
they do not silently diverge into a never-aging corner.

Player Development writes only Attribute values, so the derived-on-read Position Rating, Overall Rating,
and Transfer Value stand untouched.

## Alternatives considered

- **An asymptotic curve with noise.** Rejected: the noise buys nothing a deterministic curve lacks at
  this scale, and it would require a seed to stay replayable.
- **A hard-stop clamp at the ceiling.** Rejected: the fraction-of-gap approach self-clamps — it never
  overshoots — and handles decline uniformly by treating a falling ceiling like any other gap.
- **A separate development curve from the generation curve.** Rejected: two curves for one concept drift
  apart, and a player would grow toward a different ceiling than they were generated against.

## Consequences

- Development is exactly replayable from event history with no seed recorded.
- The "how fast" knob is a single named tuning constant, not a shape a designer must tweak point by
  point.
- Changing the generation ceiling automatically changes the development ceiling, which is intended;
  they cannot be tuned independently.
