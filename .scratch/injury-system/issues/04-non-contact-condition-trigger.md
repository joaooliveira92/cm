# 04: Non-contact (condition-driven) trigger

**What to build:** the background fatigue-injury path. Every match minute, once a player's Condition
drops below the threshold (~75%), the engine rolls a check where risk =
`(100 − Condition) × Injury Proneness × Match Intensity`; the lower the Condition the faster risk
climbs, so exhausted, injury-prone players are increasingly likely to pull up (hamstring / calf /
strain) — routed through ticket 03's severity pipeline. An injury-prone, exhausted player escalated
from an existing orange knock to red is part of this path.

**Blocked by:** 02 (per-player Condition), 03 (severity pipeline).

**Status:** ready-for-agent

- [ ] A per-minute background check fires once Condition is below the threshold.
- [ ] Risk climbs with `(100 − Condition)`, Injury Proneness, and Match Intensity.
- [ ] A hit produces a non-contact Injury event routed through the ticket 03 pipeline (severity rolled, penalties applied).
- [ ] An existing orange knock left on the pitch escalates to a red via this path before full-time.
- [ ] Deterministic from the seed; engine tests cover a low-Condition, high-proneness player pulling up.