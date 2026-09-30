# 26: Engine framework: resolution and the chance pipeline

**What to build:** Matches are decided by the chance pipeline: possession from midfield, an attack
attempt from attack against defence, a chance type (through ball, cross, long shot, run with the ball,
hold-up and lay-off, counter), a creator and finisher picked by weight, and an outcome from the
finisher's attributes against the defenders' and goalkeeper's. `Foul` and `Offside` events join the
timeline. A resolution step outside the engine turns the Tactic into team modifiers and per-slot
behaviour vectors, with phase by row and coverage-scaled Phase Strength; the engine reads numbers only.
This replaces ticket 21's transitional adapter. Mentality and Passing get their ticket 15 effects
here, proving the path; the calibration harness ships as a script gate.

Seam: the engine's pure simulation and the resolution function; no new failure channel. Replay stays
exact under the seed.

**Decisions:**

- **A chance pipeline inside the three-phase engine (possession, attempt, chance type, weighted creator and finisher, attribute-based outcome), new Foul and Offside events, a resolution step that turns the Tactic into team modifiers and per-slot behaviour vectors the engine consumes as numbers, a suitability cost that scales decision-making and positional attributes, runs that count in the target cell in possession, closest-attribute mappings, and a tuning table proved by directional tests and a calibration harness.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).
- **Phase Strength = average × coverage factor (normal 4/4/2, diminishing returns), plus width coverage for crosses; runs count fully in the target row in possession; the suitability factor falls gently to about 0.9 at 15 and steeply below; new match stats (fouls, offsides, possession, shots by chance type) and commentary templates (foul, offside, beaten trap, chance types, AI tactical and formation changes) on the match and post-match screens.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-phase-strength-scales-with-coverage.md).

**Blocked by:** 21

**Status:** ready-for-agent

- [ ] The engine package imports no tactics vocabulary.
- [ ] A seeded match replays event for event; seeded match specs are re-pinned where their scenario moved.
- [ ] Directional tests: more attacking Mentality raises attempts and goals conceded; Long passing lowers possession.
- [ ] The calibration script reports league averages inside the targets (goals 2.5-2.8, yellows 3-4, fouls 20-26).
- [ ] Engine, shared and main match tests pass.
