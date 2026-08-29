# 08: Injury commentary & UI

**What to build:** the match-day feed and screens reflect the new injury system. Commentary templates
for the new severities ("Player X is clutching his hamstring…", "The physio is up to the bench…",
stretcher lines for severe). Severity-scaled injury indicator next to a player (soft green cross for
knocks, flashing red cross for severe). The manager prompts for the no-subs fallback: play-on /
bring-off for an orange, and the forced tactics rearrangement for a red.

**Blocked by:** 03 (severity data to narrate), 07 (the no-subs manager flows to present).

**Status:** ready-for-agent

- [ ] Commentary templates for contact vs non-contact and Light / Medium / Severe injuries, non-repeating per the existing template rules.
- [ ] A severity-scaled injury indicator next to the player (green for knocks, red for severe) in the match day feed.
- [ ] The orange play-on / bring-off prompt and the red forced-rearrangement flow are reachable from the match day screen.
- [ ] Commentary and prompts consume the same typed injury events the engine emits (no separate representation).