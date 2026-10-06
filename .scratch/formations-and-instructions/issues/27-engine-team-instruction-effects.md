# 27: Engine: the remaining team-instruction effects

**What to build:** Focus Passing, Tackling, Closing Down, Offside Trap (with the beaten-trap
one-on-one), Zonal Marking, Counter Attack and Men Behind The Ball act on the pipeline as ticket 15's
approved table fixes, with sizes as named tuning constants.

Seam: resolution and engine; no new failure channel.

**Decisions:**

- **A chance pipeline inside the three-phase engine (possession, attempt, chance type, weighted creator and finisher, attribute-based outcome), new Foul and Offside events, a resolution step that turns the Tactic into team modifiers and per-slot behaviour vectors the engine consumes as numbers, a suitability cost that scales decision-making and positional attributes, runs that count in the target cell in possession, closest-attribute mappings, and a tuning table proved by directional tests and a calibration harness.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).

**Blocked by:** 26

**Status:** resolved

- [x] A directional test per instruction value, over many seeded matches.
- [x] Calibration stays inside its targets.
- [x] Engine and shared tests pass.
