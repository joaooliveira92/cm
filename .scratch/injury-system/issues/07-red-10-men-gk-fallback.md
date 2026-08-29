# 07: Red / 10-men / GK fallback

**What to build:** the no-substitutes-reserved injury drama, played out on the tactics screen. With no
subs left, a **Red** injury can't be replaced: the player is forced off, the slot locks empty, the
team plays with 10 men, and the match pauses for the manager to rearrange the remaining players. An
**Orange** injury leaves the choice to the manager — leave the player on (crippled, at risk of
escalation) or drag them off and play with 10 men. The **goalkeeper** special case: a red keeper
forces an outfield player into the GK slot — the player keeps their attributes but Goalkeeping counts
as 1 for shot-stopping — and the match can't resume until that slot is filled.

**Blocked by:** 06 (so red/orange forced-off semantics exist).

**Status:** ready-for-agent

- [ ] A red injury with no subs left locks the injured slot empty and reduces the team to 10; the manager rearranges in the tactics screen.
- [ ] An orange injury with no subs left offers a play-on (crippled, escalation risk) or bring-off (10 men) choice.
- [ ] A red keeper with no subs left forces an outfield player into the GK slot, Goalkeeping treated as 1 for shot-stopping; the match cannot resume until the slot is filled.
- [ ] The engine honors the 10-men / empty-slot / GK-at-1 state and reflects it in the read-model.