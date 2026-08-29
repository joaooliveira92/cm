# 01: Injury & fitness attributes

**What to build:** the player model grows two attributes the injury system keys off:
`Injury Proneness` (hidden, 1–20) and `Natural Fitness` (visible, 1–20). Generated players have
sensible, distinct spreads; `Stamina`, `Bravery`, and `Aggression` already exist and are untouched.
Position Rating, Overall Rating, and Transfer Value do not change. The squad/tactics screens expose
Natural Fitness like any visible attribute while keeping Injury Proneness hidden.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Two attributes on the player model (Injury Proneness hidden, Natural Fitness visible), on the same 1–20 scale as the existing 19.
- [ ] Injury-game produces distinct spreads across player tier (stars vs prospects vs journeymen).
- [ ] Injury Proneness is never surfaced to any UI; Natural Fitness shows alongside the other visible Physical attributes.
- [ ] Position Rating / Overall Rating / Transfer Value formulas are unchanged.
- [ ] Engine tests cover the new attributes and generation.