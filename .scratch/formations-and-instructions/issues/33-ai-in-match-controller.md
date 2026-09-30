# 33: AI: the in-match tactical controller

**What to build:** The simulation loop takes a tactical controller callback, invoked every five
minutes and after goals and red cards, implemented outside the engine: losing after 60' → Mentality
+1, after 75' → +2 and the attacking variant; winning by one after 75' → −1, after 85' → Men Behind
The Ball; a red card → a template that drops a forward. Its changes go through the same validation as
the human's, emit CM's tactical-change commentary, and are journaled as `ChangeTactics` for the human's
opponent so replay reproduces them.

Seam: the engine's controller hook (numbers in, a new resolved Tactic out) and the main process's
journaling.

**Decisions:**

- **Seeded CM staff preferences per AI club; a preferred template with a best-XI fallback and style-mapped instructions before kickoff; a deterministic in-match rule table by score, minute and red cards; all run by a tactical controller outside the engine and journaled as `ChangeTactics` for the human's opponent.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-ai-tactics-from-seeded-preferences-via-a-controller.md).
- **A chance pipeline inside the three-phase engine (possession, attempt, chance type, weighted creator and finisher, attribute-based outcome), new Foul and Offside events, a resolution step that turns the Tactic into team modifiers and per-slot behaviour vectors the engine consumes as numbers, a suitability cost that scales decision-making and positional attributes, runs that count in the target cell in possession, closest-attribute mappings, and a tuning table proved by directional tests and a calibration harness.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).

**Blocked by:** 31, 32

**Status:** ready-for-agent

- [ ] A losing AI side changes Mentality at the stated minutes, visible in commentary.
- [ ] Replaying a human match reproduces the opponent's changes exactly.
- [ ] Engine and main match tests pass.
