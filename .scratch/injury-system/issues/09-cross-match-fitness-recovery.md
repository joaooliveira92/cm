# 09: Cross-match fitness recovery

**What to build:** the season-long layer. Natural Fitness drives how quickly a player's Condition
recovers between matches, so a knock or a hard match carries over instead of resetting every fixture —
an injury / heavy fatigue this week leaves a player short of full Condition (or unavailable) for the
next fixture. Recovery timelines keyed off Natural Fitness and the injury's severity. This is the
layer the v1 cm-clone spec currently lists as out of scope, brought into scope here.

**Blocked by:** 01 (Natural Fitness attribute), 02 (per-player Condition).

**Status:** ready-for-agent

- [ ] Between matches, each player's Condition recovers at a rate keyed to Natural Fitness and the most recent injury severity (a knock recovers faster than a severe).
- [ ] A player not fully recovered starts the next match below 100% Condition and is available/buyable accordingly.
- [ ] The injury carried across fixtures is reflected in the squad/match availability read-model.
- [ ] Season advance and fixture generation are deterministic off the same seed conventions as the rest of the engine.