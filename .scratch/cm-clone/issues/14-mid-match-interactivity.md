# 14: Mid-match interactivity: live tactics & substitutions

**What to build:** From the Match day screen, let the player fire `ChangeTactics` and
`MakeSubstitution` while a match is in progress, and see the effect reflected in subsequently
resimulated chunks.

**Blocked by:** 13

**Status:** ready-for-agent

- [ ] Player can open a tactics/substitution control from the live Match day screen without leaving
      the match
- [ ] `ChangeTactics` issued mid-match updates `TacticalModifiers` used by subsequent
      `ResumeSimulation` chunks
- [ ] `MakeSubstitution` issued mid-match swaps a player and is reflected in subsequent Phase
      Strength calculations
- [ ] Substitutions are capped at 5 total per team across a maximum of 3 windows; halftime does not
      count as a window, and the UI enforces/reflects this cap
- [ ] An `Injury` Match Event forces an immediate substitution prompt (still within the 5-sub cap)
- [ ] Determinism still holds: replaying the same sequence of commands against the same seed
      reproduces the same resulting timeline
