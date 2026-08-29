# 11: Tactics: formations, roles, instructions

**What to build:** A Tactics screen where the player picks one of the 5 fixed v1 Formations, assigns
a Role and a player to each of its 11 slots, and sets the 3 Team Instructions (Mentality, Tempo,
Pressing). Each assigned player's Role Rating is shown. Submitting the screen issues `ChangeTactics`,
persisting the Tactic between matches until changed again.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Player can select any of the 5 v1 Formations (4-4-2, 4-3-3, 4-5-1, 3-5-2, 5-3-2)
- [ ] Player can assign one of the 8 v1 Roles plus a squad player to each of the 11 slots
- [ ] Role Rating (weighted average of Attributes against Role Weights) is shown per assigned player
- [ ] Player can set Mentality, Tempo, and Pressing, each a 3-state slider
- [ ] `ChangeTactics` persists the full Tactic shape (`{ formation, slots, mentality, tempo,
      pressing }`) and it is loaded back correctly on next visit to the screen
- [ ] Role Weights and Team Instruction multiplier tables live as `packages/shared` constants
