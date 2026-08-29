# Scouting Progress accrual & Attribute Range computation

Type: grilling
Status: resolved

## Question

Design how Scouting Progress advances and how Attribute Range is computed from it:

- Confirmed during charting: Progress accrues time-based (a fixed amount per elapsed Matchday while a
  Scout is assigned), not Fixture-watched-based. What's the actual per-Matchday increment, and is it
  linear to 100 or does it taper (diminishing returns near Fully Scouted)?
- Confirmed during charting: the real Attribute values are always the single stored source of truth;
  Attribute Range is a computed display transform (true value ± an error band that shrinks as
  Progress rises toward 0 at Progress=100), not a second persisted value — same "derived on read"
  posture as Position Rating/Transfer Value. Pin down the actual noise-band formula: does every
  Attribute narrow at the same rate, or do some Categories/Attributes reveal faster than others (e.g.
  visible-adjacent physical traits guessable from watching a player play, vs. Mental attributes
  harder to judge from the stands)?
- How does this extend to the two currently-hidden values, Potential Ability and Injury Proneness —
  do they narrow on the same Progress curve as visible Attributes, or do they stay fully hidden until
  a higher Progress threshold (reflecting that they're harder to judge than on-pitch Attributes even
  for a fully-informed observer)?
- How does Attribute Range compose into Transfer Value's existing derivation (Overall Rating, age,
  PA-gap)? Confirmed during charting that Transfer Value should show as a range for unscouted players,
  computed from the fogged inputs — spell out the actual computation (e.g. Transfer Value's range is
  just the function applied to the Attribute Range's low/high bounds, propagated through the same
  formula used for the exact figure).

Blocked by: none (can start immediately, though ticket 01's Scout/Assignment shape informs what
"Progress" is attached to).

## Answer

**Progress accrues linearly (fixed points per Matchday, tuning constant, up to 100); every Attribute
(visible, Potential Ability, Injury Proneness) shares one noise-band formula `band = maxWidth * (100 -
Progress) / 100` clamped to [1,100], no per-category rates or separate PA/Injury-Proneness threshold;
Transfer Value's range reuses the exact-figure formula unchanged, evaluated at the Attribute Range's
low/high bound pairs (Overall Rating and Potential Ability fogged, age exact).** See [Agent
Note](../../../.agents/notes/proposed/feature/2026-08-28-progress-accrual-and-attribute-range.md).
