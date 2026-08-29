Type: task
Status: resolved
Blocked by: None (can start immediately)

# 03: Player Development & Training Focus math in shared

**What to build:** the pure, deterministic core of both systems as a testable seam in
`@cm-clone/shared`. Expose the age-curve the generation code already uses so development shares one
curve with generation, and add a pure function that, given a player's current Attributes, age,
Potential Ability, and an optional focused Category, returns the player's next-season Attribute set.
Each Attribute moves a fixed fraction of the gap toward its current age-ceiling; the focused Category's
step is multiplied by a fixed constant; no RNG, no seed, self-clamping at the ceiling. Also exposes the
two named tuning constants (`PLAYER_DEVELOPMENT_FRACTION`, default ~0.65; `TRAINING_FOCUS_MULTIPLIER`,
default ~1.5).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A player's Attributes grow toward the age-appropriate ceiling through youth (the linear 16→23
      ramp), plateau through the prime (24–29), and Physical-only decline past 30 — matching the
      generation curve.
- [ ] Growth is a deterministic, fraction-of-gap step: identical inputs (attributes, age, Potential
      Ability, focus) produce identical output.
- [ ] No Attribute ever overshoots its ceiling (self-clamping at the ceiling).
- [ ] A focused Category's growth step is multiplied by the focus constant; the other three Categories
      are unchanged; a no-focus player develops with no multiplier applied.
- [ ] Hidden attributes develop by the same rules as visible ones.
- [ ] `PLAYER_DEVELOPMENT_FRACTION` and `TRAINING_FOCUS_MULTIPLIER` are named, exported tuning
      constants in `@cm-clone/shared`.
- [ ] Direct unit tests cover all of the above, following the `packages/shared/test` pattern (no
      Electron, no SQLite).

## Comments

- Published from the approved `to-tickets` breakdown (spec: `.scratch/training/spec.md`).
- Implemented in commit `5e39c4a` ("Implement Player Development & Training Focus (tickets 03-05)").