# Map: Training

Label: wayfinder:map

## Destination

A written **spec document**, mirroring the cm-clone map's shape, covering two new domain systems for
the Championship Manager clone: **Player Development** (the per-season, age-shaped Attribute growth
toward Potential Ability that [CONTEXT.md](../../CONTEXT.md) describes but that has never actually
been implemented — greenfield, not a bug) and **Training Focus** (a per-player, per-Category
assignment, human-managed clubs only, that biases how much of a season's Player Development a
Category receives). Ready to hand off to a separate implementation effort, same as cm-clone's
spec.md was.

## Notes

- This milestone is scoped **strictly** to Player Development + Training Focus. It does not sweep up
  any of cm-clone's leftover "Not yet specified" fog (per-screen UI layout, match-engine event-odds
  mechanics, Stature Tier mobility, AI difficulty tiers) — those are unrelated enough to stay out and
  can become their own map(s) later.
- No research or dedicated RPC-wiring ticket, unlike cm-clone's ticket 07: this is closed-form game
  design with no external source of truth, and only two new systems with no cross-Decider
  reconciliation needed, so each design ticket owns its own event/command shape as part of its answer.
- Skills every session should consult: `grilling`, `domain-modeling` for both tickets — same as
  cm-clone.
- CONTEXT.md already carries draft glossary entries for **Player Development** and **Training Focus**
  (added while charting this map); tickets should sharpen, not rename, these unless a real conflict
  surfaces.

## Decisions so far

- [Player Development curve](issues/01-player-development-curve.md): per-`SeasonConcluded`, each
  Attribute moves a deterministic fixed fraction (~65%) of the gap toward the reused
  `attributeCeilingOn20Scale` age-ceiling (linear 16→23 ramp to PA, plateau 24–29, Physical-only
  decline past 30). Uniform across Categories; hidden attributes develop identically. Club Decider
  owns it, triggered off `SeasonConcluded` via the cross-Decider reactor, emitting `PlayerDeveloped`.
  ADR-0001 untouched. (ADR-0011)
- [Training Focus mechanics](issues/02-training-focus-mechanics.md): per-player, per-Category focus
  multiplies the focused Category's seasonal growth fraction by a single named constant (×1.5), purely
  additive (no downside to other Categories). No-focus is a real fourth state and the default on
  generation. Changeable any point via `SetTrainingFocus` → Club Decider, emitting its own
  `TrainingFocusSet` event distinct from `PlayerDeveloped`; missing values read as no-focus with no
  backfill. AI clubs use unmodified development.

## Not yet specified

_None._ Both design tickets are resolved; the way to the destination (a domain spec for the two
systems) is clear.

## Out of scope

- Youth academy/intake system — Training applies uniformly across ages via the existing age-curve;
  no separate youth-development concept in this milestone.
- Training facilities/coaches/scarcity — Training Focus is always-on with no slot or capacity
  mechanic; adding facilities is a distinct "club infrastructure" concept not decided anywhere yet.
- Training × Condition/injury interaction — Training Focus is purely an Attribute-growth lever; the
  injury-system follow-on's Condition/Natural-Fitness recovery layer is untouched.
- AI-club training behavior — AI clubs' players always develop on unmodified Player Development,
  matching v1's "AI clubs stay dumb" precedent (see issues/17-ai-club-transfer-and-tactics-automation.md
  in the cm-clone effort).
- Training screen UI layout — this milestone's destination is a domain spec for the two systems, not a
  per-screen UI; layout is implementation detail for the hand-off effort, not a step on the route to it.
  Removed from Not-yet-specified once both design tickets resolved.
