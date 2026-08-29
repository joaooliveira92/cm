# 03: Injury severity & penalty pipeline

**What to build:** the match-scoped `Injury` event becomes a typed injury carrying a trigger type
(contact / non-contact) and a Severity (Light / Medium / Severe) mapped to an orange/red tier. On
firing, the engine applies the in-match penalty: a Condition drop and a temporary slash to the
player's Pace / Acceleration / Agility. A Severe (red) injury removes the player from the pitch
matrix. This is the single shared pipeline that both trigger paths (tickets 04, 06) feed into, so it
must expose one clean entry point.

**Blocked by:** 01 (injury attributes feed the severity matrix).

**Status:** ready-for-agent

- [ ] `Injury` carries a `trigger` (contact | non-contact) and a `severity` (light | medium | severe) plus an orange/red tier.
- [ ] Severity is rolled through an Injury Matrix biased by trigger type (non-contact leans muscular; contact leans structural), scaled by Injury Proneness.
- [ ] On injury the player's Condition is dropped (e.g. to ~35%) and Pace / Acceleration / Agility are slashed by ~50% for the remainder of the match.
- [ ] Severe injuries remove the player from the pitch matrix (open slot / down to 10), consistent with forced-off semantics.
- [ ] Engine tests exercise the pipeline entry point for each severity.