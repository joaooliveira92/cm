# 11: No-substitutes manager flow (orange play-on/bring-off, red forced-off)

**What to build:** the no-substitutes-reserved injury drama surfaced to the manager on the match-day
screen (07's manager-facing flow). With no subs left, a **red** injury forces the player off, the
slot locks empty (team plays with 10 — or, for the last keeper, an outfield stand-in at Goalkeeping
= 1), and the match pauses for the manager to rearrange the remaining players in the tactics screen.
An **orange** injury offers the manager a choice: leave the player on (crippled, at risk of
escalating to red) or drag them off and play with 10 men.

The engine's 10-men / empty-slot / GK-stand-in semantics already work and the read-model already
carries the typed injuries with their orange/red tiers; this ticket makes the interactive
manager-facing flow reachable from the match-day screen and honors the chosen outcome in the engine.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A red injury with no subs left locks the injured slot empty and reduces the team to 10; the
      manager rearranges the remaining players in the tactics screen, and the match cannot resume
      until the slot is addressed (a red keeper forces an outfield player into the GK slot at
      Goalkeeping 1 first).
- [ ] An orange injury with no subs left offers a play-on (crippled, escalation risk) or bring-off
      (10 men) choice; either choice is honored by the engine.
- [ ] The match-day screen surfaces the current 10-men / empty-slot / GK-at-1 state from the read-model.
- [ ] Desktop tests cover the red forced-off with no subs, the orange play-on/bring-off choice, and
      the red-keeper GK fallback.