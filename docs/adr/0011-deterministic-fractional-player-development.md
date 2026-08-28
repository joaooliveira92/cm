# Player Development is a deterministic, fraction-of-gap step toward the reused generation age-ceiling

Player Development (the per-`SeasonConcluded` step that moves Attributes toward Potential Ability) is
fully deterministic — no RNG, and thus no seed — with each Attribute moving a fixed fraction of the
remaining gap toward the age-dependent ceiling each season. That ceiling is the *same*
`attributeCeilingOn20Scale` function Player generation already uses, which encodes growth through
youth (linear 16→23 ramp toward PA), a plateau through the prime (24–29), and Physical-only decline
past 30.

We chose determinism here even though the match engine (ADR-0002) chose seeded randomness. The two
differ because their jobs differ: a match needs per-minute texture, so it draws from a seed; Player
Development's annual delta is a smooth function and draws nothing, so a seed would be dead weight —
the result is trivially replayable from event history without one. We rejected an asymptotic
curve-with-noise and a hard-stop clamp: the fraction-of-gap approach self-clamps at the ceiling
(never overshoots) and handles decline uniformly by treating a falling ceiling like any other gap,
while a fixed fraction keeps the "how fast" knob a single named tuning constant rather than a shape
the designer must tweak point-by-point.

We also reuse the generation ceiling rather than writing a new curve, so the ceiling a young player
is generated toward is exactly the ceiling they grow toward each season — one curve, not two that
can drift apart. The four Categories grow uniformly; the only Category divergence is that Physical
Attributes decline past 30 while Technical/Mental hold. Hidden attributes (e.g. Injury Proneness)
develop identically so they don't silently diverge into a never-aging corner. Player Development
writes only Attribute values, so the derived-on-read Position Rating / Overall / Transfer Value
(ADR-0001) stand untouched.