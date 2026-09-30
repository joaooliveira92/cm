# Agent Note: Tactics resolve to behaviour vectors that drive a chance pipeline

Status: proposed

## Problem

The match engine resolves each minute from three Phase Strengths: midfield decides possession,
attack against defence and a tempo multiplier decide whether an attack happens, fixed shares decide
its outcome (12% goal, 18% big chance, 35% on target, the rest missed), and the shooter is picked
uniformly from the attack-phase slots. Cards come from a pressing multiplier alone; there are no
fouls, offsides, crosses or long shots. Championship Manager 03/04's instructions (cross ball, long
shots, try through balls, tackling, offside trap, runs, and the rest) have nothing in that engine to
act on, and the out-of-position cost the positional effort ruled in has nowhere to apply. The engine
must stay non-spatial and deterministic, and must not read tactics vocabulary.

## Proposal

**A chance pipeline inside the three-phase engine.** Each attack runs:

1. Possession, from midfield strength.
2. An attack attempt, from attack against defence, adjusted by team modifiers from Passing,
   Mentality and Counter Attack. Tempo is gone.
3. A chance type: through ball, cross, long shot, run with the ball, hold-up and lay-off, or counter,
   weighted by the resolved behaviour of the players involved and the creator's attributes.
4. A creator and a finisher, picked by weight from slot phase, behaviour weights and attributes.
5. An outcome from the finisher's attributes against the defenders' and the goalkeeper's.

**New events.** `Foul` (cards come from fouls, driven by tackling, closing down and aggression) and
`Offside` (driven by the offside trap and forward runs). Shot and goal events record their chance
type. Corners and free kicks wait on the set-pieces decision.

**The boundary.** A resolution step outside the engine turns the Tactic into numbers: team-level
modifiers plus, per slot, a behaviour vector (cross frequency, long-shot frequency, forward-run
weight, tackle hardness, pressing intensity, mentality shift, and so on) and its phase in and out of
possession. The engine consumes numbers only and never sees an instruction value, formation name or
cell. Resolution reruns on every live tactical change.

**Suitability cost.** Resolution scales the occupant's decision-making and positional attributes
(positioning, decisions, teamwork, composure) by a factor falling from 1.0 at suitability 20, CM
01/02's mechanism. The scaled attributes feed every engine read. The game has no Versatility
attribute, so the scaling is the same for everyone.

**Runs.** A slot with a run target counts in the target cell's row and phase while its team has the
ball, and in its base cell's otherwise; suitability is scored against the target cell in possession.

**Attributes.** Where CM's instructions read attributes this game lacks, resolution uses the closest
existing one: Shooting for Long Shots, Positioning for Marking and Off The Ball, Decisions for
Anticipation, Flair for Creativity. The mapping lives in one table so a later attribute-set effort
can swap it.

**Proof.** Every effect size is a named constant in one tuning table. Each setting has a directional
test over many seeded matches. Determinism stays tested. A calibration harness checks league
averages against real-football targets (about 2.5-2.8 goals, 3-4 yellow cards and 20-26 fouls per
match).

## Relationship to existing notes

- Supersedes in part
  [the three-phase match engine note](../../implemented/architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md):
  its "five numbers plus a phase-slot map" boundary becomes team modifiers plus per-slot behaviour
  vectors with possession-dependent phase. Its three phases, its rule that the engine never reads
  tactics vocabulary, and its determinism all stand.
- Supersedes in part
  [Role Rating is computed at tactic-resolution time](../../implemented/architecture/2026-08-27-role-rating-outside-match-engine.md):
  the role bump goes; resolution outside the engine stays the pattern. Its "Formation" section is
  superseded: runs and suitability now act beyond selecting which ratings feed each phase.
- Both get `> Superseded in part` blocks when this ships.

## Alternatives considered

- **Keep fixed outcome shares and map instructions onto the three multipliers.** Rejected: most
  instructions would collapse into the same attack/defence nudge, which is the faked effect the
  effort ruled out.
- **Let the engine read the Tactic.** Rejected: couples the engine to tactics vocabulary that just
  changed wholesale, and would have to change with it again.
- **A spatial engine.** Out of scope for this effort.
- **Add CM's missing attributes here.** Rejected: it reaches generation, development, ratings,
  scouting and every player screen, and deserves its own effort.

## Acceptance criteria

- The engine package imports no tactics vocabulary; its inputs are numeric.
- Every team and player instruction, every run and suitability has a directional test.
- The calibration harness's league averages fall inside the stated targets.
- Replaying a match from its seed and commands reproduces it event for event.

## Risks

- A larger engine is slower; the full season simulation must stay within its current budget.
- Balance: many interacting constants. The calibration harness is the guard.
- Closest-attribute mappings are approximations until the attribute set is revisited.
