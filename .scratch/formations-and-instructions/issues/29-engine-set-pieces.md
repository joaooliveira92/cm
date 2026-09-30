# 29: Engine: set pieces

**What to build:** Corner, Free Kick and Penalty events arise in the pipeline (corners from saved or
blocked shots and cleared crosses, free kicks and penalties from fouls); attacking-third throw-ins
resolve by their instructions and roles without a visible event. The nominated taker delivers,
scaled by the closest attributes; team set-piece instructions choose the chance type; roles choose
targets and weigh marking. Absent nominees fall to the next in the list, then to the on-pitch player
with the best relevant attribute; with no captain set one is chosen, and the armband passes down the
list.

Seam: resolution and engine; the captain handover is also read by the match report.

**Decisions:**

- **Team set-piece instructions and per-slot set-piece roles live in the Tactic Template; the captain and ordered taker lists live only on the live Tactic; the engine uses them through Corner, Free Kick and Penalty events and long throws in the chance pipeline; absent nominees fall back down the list, then to the best relevant attribute; the captain has no match effect.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md).
- **A chance pipeline inside the three-phase engine (possession, attempt, chance type, weighted creator and finisher, attribute-based outcome), new Foul and Offside events, a resolution step that turns the Tactic into team modifiers and per-slot behaviour vectors the engine consumes as numbers, a suitability cost that scales decision-making and positional attributes, runs that count in the target cell in possession, closest-attribute mappings, and a tuning table proved by directional tests and a calibration harness.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).

**Blocked by:** 26

**Status:** ready-for-agent

- [ ] Changing the penalty taker changes who takes penalties; conversion follows his attributes.
- [ ] A directional test per team set-piece instruction and role family.
- [ ] Set-piece goals are a quarter to a third of all goals in calibration.
- [ ] A substituted captain passes the armband to the next nominee on the pitch.
- [ ] Engine and main match tests pass.
