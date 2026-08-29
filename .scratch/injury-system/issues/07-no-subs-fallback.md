# 07: No-subs fallback (engine + manager flow)

**What to build:** the no-substitutes-reserved injury drama, played out on the match-day tactics screen. With no subs left, a **Red** injury forces the player off, the slot locks empty (team plays with 10 — or, for the last keeper, an outfield stand-in at Goalkeeping = 1), and the match pauses for the manager to rearrange the remaining players in the tactics screen. An **Orange** injury offers the manager a choice: leave the player on (crippled, at risk of escalating to red via the non-contact trigger) or drag them off and play with 10 men. The engine honours the chosen outcome and reflects the 10-men / empty-slot / GK-at-1 state in the read-model.

**Blocked by:** 06 (contact-duel trigger, so red/orange forced-off semantics exist).

**Status:** ready-for-agent

- [ ] Red injury with no subs left locks the injured slot empty, reduces the team to 10; the manager rearranges remaining players in the tactics screen; the match cannot resume until the slot is addressed.
- [ ] Red keeper with no subs left forces an outfield player into the GK slot (Goalkeeping treated as 1 for shot-stopping) before the match can resume.
- [ ] Orange injury with no subs left offers a play-on (crippled, escalation risk) or bring-off (10 men) choice; either choice is honoured by the engine.
- [ ] The match-day screen surfaces the current 10-men / empty-slot / GK-at-1 state from the read-model.
- [ ] Desktop tests cover red forced-off with no subs, orange play-on/bring-off choice, and red-keeper GK fallback.