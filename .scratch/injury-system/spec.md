Status: ready-for-agent

# Injury & fitness system — spec

Refines the match-scoped `Injury` event (v1 cm-clone, [spec](../cm-clone/spec.md)) into a full
injury/fitness system with two trigger paths, a severity pipeline, no-subs fallbacks, and a
cross-match recovery layer. Builds on the existing player attribute model, match engine, and match
day commentary.

## Design foundations (from the originating conversation)

**Two data layers:**
- *Static player attributes*: Injury Proneness (hidden, 1–20, primary multiplier), Natural Fitness
  (visible, 1–20, recovery speed + mitigates non-contact severity), Stamina (visible, 1–20, condition
  decay rate), Bravery & Aggression (visible, 1–20, raise contact-injury frequency).
- *Dynamic match states*: per-player Condition % (starts ~100, decays with Stamina/work-rate/time;
  below ~75% the muscular/fatigue risk rises exponentially), and Match Intensity/Tempo (more
  high-speed actions, more injury checks).

**Two trigger paths:**
- *Contact (Path A)*: on a physical duel, risk =
  `BaseCollisionChance × (defender Aggression / attacker Bravery) × attacker Injury Proneness`.
- *Non-contact (Path B)*: every minute below a Condition threshold, risk =
  `(100 − Condition) × Injury Proneness × Match Intensity`; leans muscular/fatigue.

**Resolution pipeline:** Trigger → determine Severity (Light / Medium / Severe) & Type → apply
in-game penalty (Condition drop + attribute slash) → commentary → UI / manager prompt.

**No-subs fallback (orange vs red):**
- *Orange* (Light/Medium, can play on): not forced off; condition penalty + attribute slash; leaving
  them on risks escalation to red. Manager may leave them on or drag them off (team plays with 10 men).
- *Red* (Severe, must come off): condition to ~0, forced off. With no subs left the slot is locked
  empty and the team plays with 10 men; the manager rearranges the remaining players in the tactics
  screen.
- *Goalkeeper special case*: a red keeper with no subs left forces an outfield player into the GK
  slot (keeps attributes, but Goalkeeping ratings treated as 1 for shot-stopping) before the match can
  resume.

## Ticket map

- [01 — Injury & fitness attributes](issues/01-injury-fitness-attributes.md)
- [02 — Per-player match Condition](issues/02-per-player-match-condition.md)
- [03 — Injury severity & penalty pipeline](issues/03-injury-severity-penalty-pipeline.md)
- [04 — Non-contact (condition-driven) trigger](issues/04-non-contact-condition-trigger.md)
- [05 — Design: contact/duel modeling (grilling)](issues/05-design-contact-duel-modeling.md)
- [06 — Contact (duel) trigger](issues/06-contact-duel-trigger.md)
- [07 — Red / 10-men / GK fallback](issues/07-red-10-men-gk-fallback.md)
- [08 — Injury commentary & UI](issues/08-injury-commentary-ui.md)
- [09 — Cross-match fitness recovery](issues/09-cross-match-fitness-recovery.md)