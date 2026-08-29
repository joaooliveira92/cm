# 09: Cross-match fitness recovery

**What to build:** the season-long fitness layer. A player who took a knock or played heavy minutes finishes a fixture below full Condition; that shortfall carries over to the next fixture, recovered between fixtures at a rate keyed to their Natural Fitness and the most recent injury's severity. A per-player fitness ledger is persisted per Season (seeded at 100% full), and resolving a fixture writes each on-pitch player's final Condition and any injury severity back to the ledger. A not-fully-recovered player starts their next match below 100% Condition, reflected in the squad/match availability read-model.

**Blocked by:** 01 (Natural Fitness attribute keys recovery rate), 02 (per-player Condition provides the match-ending value to persist).

**Status:** ready-for-agent

- [ ] A per-player fitness ledger is persisted per Season, seeded at full Condition (100%).
- [ ] Resolving a fixture writes each on-pitch player's final Condition back to the ledger; an injury's severity is recorded against the player.
- [ ] Between fixtures, each player's Condition recovers toward 100% at a rate keyed to Natural Fitness and the most recent injury severity (a knock recovers faster than a severe).
- [ ] A player not fully recovered starts the next match below 100% Condition, shown accordingly in the squad/match availability read-model.
- [ ] Season advance and the recovery step are deterministic off the same seed conventions as the rest of the engine.
- [ ] Engine and desktop tests cover: an injured/heavily-used player carrying a shortfall into the next fixture, recovering by severity, and starting below full.