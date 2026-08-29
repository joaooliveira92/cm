# 10: Cross-match fitness recovery, wired through the season

**What to build:** the season-long fitness layer (Ticket 09's end-to-end behaviour). A player who took
a knock or played heavy minutes finishes a fixture below full Condition, that shortfall carries over
to the next fixture, recovers between fixtures at a rate keyed to their Natural Fitness and the most
recent injury's severity, and a not-fully-recovered player starts the next match below 100% Condition
— reflected in squad/match availability.

The engine already provides the pure recovery math and the hook: a `startingCondition` per player
feeds a below-full kickoff, and `conditionAfterDays` computes recovery from Condition, days, Natural
Fitness, and severity. This ticket gives that machinery a real producer and consumer so the loop
actually closes across fixtures rather than only being unit-tested.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A per-player fitness ledger is persisted per Season, seeded at full Condition (100%).
- [ ] Resolving a fixture writes each on-pitch player's final Condition back to the ledger (using the
      engine's full-time Condition surface); an injury's severity is recorded against the player.
- [ ] Between fixtures, each player's Condition recovers toward 100% at a rate keyed to Natural
      Fitness and the most recent injury severity (a knock recovers faster than a severe).
- [ ] A player not fully recovered starts their next match below 100% Condition (consuming
      `startingCondition`), and is shown accordingly in the squad/match availability read-model.
- [ ] Season advance and the recovery step are deterministic off the same seed conventions as the rest
      of the engine.
- [ ] Engine and desktop tests cover: an injured/heavily-used player carrying a shortfall into the
      next fixture, recovering by severity, and starting below full.