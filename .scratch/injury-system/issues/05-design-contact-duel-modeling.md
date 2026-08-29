# 05: Design — contact / duel modeling (grilling)

**Type:** grilling
**Status:** ready-for-agent

**What to build:** a locked design decision (recorded as an ADR) for how the match engine models the
"physical duel / collision" that Path A contact injuries key off. The current engine has no duel
concept — it resolves possession by a Midfield battle and attacks by an Attack-vs-Defense roll, with
pressing scaling card/injury odds. We need to decide: which engine moment counts as a contact event
(a tackle, a 50/50, an aerial), how defender Aggression and hard-pressing factor in, and how the
collision check sits inside the existing event loop without a new simulation layer.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A concrete mapping from existing engine moments to "duels" is chosen and justified (e.g. reusing BigChance / high-tempo possession battles as duel moments) — no new simulation layer added for v1.
- [ ] The contact risk formula `BaseCollision × (defender Aggression / attacker Bravery) × attacker Injury Proneness` is pinned with concrete constants.
- [ ] How Pressing and Tempo multiply the frequency of duel checks is specified.
- [ ] Decision recorded as an ADR; the vocabulary reflected in CONTEXT.md.