# 06: Contact (duel) trigger

**What to build:** the contact-injury path. When a physical duel resolves (per ticket 05's decision),
the engine rolls a collision check with risk =
`BaseCollision × (defender Aggression / attacker Bravery) × attacker Injury Proneness`; a hit produces
a contact Injury (broken toe, twisted ankle, dead leg — rolled severity/type via ticket 03's
pipeline). Higher Aggression and hard-pressing defenders make contact injuries more frequent, matching
the era's dirty-football feel.

**Blocked by:** 03 (severity pipeline), 05 (duel-modeling decision).

**Status:** ready-for-agent

- [ ] A contact Injury fires from the duel/collision point decided in ticket 05, routed through ticket 03's pipeline.
- [ ] The risk formula uses the decided BaseCollision constant, defender Aggression / attacker Bravery, and attacker Injury Proneness.
- [ ] Aggressive, hard-pressing defenders measurably raise contact-injury frequency.
- [ ] Deterministic from the seed; engine tests cover a high-Aggression challenge causing a contact injury.