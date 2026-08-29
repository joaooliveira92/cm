# 02: Per-player match Condition

**What to build:** the match engine tracks a live `Condition %` for each on-pitch player, starting
near 100 and decaying with that player's Stamina, the team's Tempo, and elapsed minutes — replacing/
augmenting the current squad-average fatigue. Condition is exposed on the match read-model so it can
be seen decaying across a match and is the substrate the injury triggers and penalty pipeline read
from.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Each on-pitch player has a running Condition % that decays faster for low-Stamina players and under high Tempo.
- [ ] Late-match fatigue (the existing ~60′ Midfield/Defense decay) is driven by per-player Condition rather than squad-average Stamina alone.
- [ ] Condition is visible on the match-day read-model per player, updated through the match.
- [ ] Deterministic from the MatchStarted seed, like the rest of the engine.