# 30: Engine: runs, the out-of-position cost, stats and commentary

**What to build:** A slot with a run counts in its target cell's row in possession and its base row
otherwise, and tires slightly faster; a player out of position has his decision-making and positional
attributes scaled by the suitability curve. Match statistics gain fouls, offsides, possession and
shots by chance type; commentary gains templates for fouls, offsides, a beaten trap, each chance type,
and AI tactical and formation changes; the match and post-match screens show them.

Seam: resolution, engine, the statistics read model and commentary; the new statistics are additive
to their contract.

**Decisions:**

- **Phase Strength = average × coverage factor (normal 4/4/2, diminishing returns), plus width coverage for crosses; runs count fully in the target row in possession; the suitability factor falls gently to about 0.9 at 15 and steeply below; new match stats (fouls, offsides, possession, shots by chance type) and commentary templates (foul, offside, beaten trap, chance types, AI tactical and formation changes) on the match and post-match screens.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-phase-strength-scales-with-coverage.md).
- **A chance pipeline inside the three-phase engine (possession, attempt, chance type, weighted creator and finisher, attribute-based outcome), new Foul and Offside events, a resolution step that turns the Tactic into team modifiers and per-slot behaviour vectors the engine consumes as numbers, a suitability cost that scales decision-making and positional attributes, runs that count in the target cell in possession, closest-attribute mappings, and a tuning table proved by directional tests and a calibration harness.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).

**Blocked by:** 26

**Status:** ready-for-agent

- [ ] Directional tests for runs and for playing a player out of position.
- [ ] The new statistics reconcile with the timeline.
- [ ] Each new event has commentary; engine, main and renderer tests pass.
