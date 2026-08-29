# 08: Injury commentary & UI

**What to build:** the match-day feed and screens fully reflect the new injury system. Commentary covers both trigger paths — **contact** (broken toe, twisted ankle, dead leg — structural) and **non-contact** (hamstring, calf, strain — muscular/fatigue) — at every severity (light/medium/severe), non-repeating per the existing template rules. A severity-scaled injury indicator appears next to a player (soft cross for knocks, flashing cross for severe). The orange play-on/bring-off prompt and red forced-rearrangement flow from ticket 07 are reachable from the match-day screen.

**Blocked by:** 04 (non-contact trigger fires events to narrate), 06 (contact trigger fires events to narrate), 07 (no-subs manager flows to surface).

**Status:** ready-for-agent

- [ ] Commentary templates for contact vs non-contact and Light / Medium / Severe injuries, non-repeating per existing template rules.
- [ ] Contact commentary uses structural body-part phrasing; non-contact uses muscular/fatigue phrasing — distinct at every severity.
- [ ] A severity-scaled injury indicator next to the player (green for knocks, red for severe) in the match-day feed.
- [ ] The orange play-on / bring-off prompt and the red forced-rearrangement flow are reachable from the match-day screen.
- [ ] Commentary and prompts consume the same typed injury events the engine emits (no separate representation).
- [ ] Shared tests cover a contact injury and a non-contact injury rendering different commentary for the same severity.