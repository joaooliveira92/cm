# 15: Season & calendar: fixtures, AdvanceCalendar, League Table

**What to build:** Season start generates a freshly shuffled double round-robin fixture list (38
fixtures/club) among the 20 clubs, with no seeding by prior standings. `AdvanceCalendar` is the sole
player-invoked time-advancing command: it jumps to the next Matchday or Transfer Window boundary,
resolving the player's fixture (via the match engine, ticket 12) and auto-resolving the other 9
fixtures synchronously via an internal-only `SimulateAiFixture` command. League Table and Fixtures
screens display the results.

**Blocked by:** 12

**Status:** resolved

- [x] Season start generates a double round-robin (38 fixtures/club), freshly shuffled each season,
      no seeding
- [x] `AdvanceCalendar` jumps to the next scheduled event (a Matchday's fixtures or a Transfer Window
      open/close) — no day-by-day clock
- [x] Crossing a Matchday resolves all 10 fixtures for that Matchday in the same request: the
      player's fixture playable in full, the other 9 resolved instantly via `SimulateAiFixture`
      (reusing the ticket-12 match engine)
- [x] League Table screen reflects points → goal difference → goals scored tie-break ordering, with
      no head-to-head tie-break
- [x] Fixtures screen shows the full season's fixture list and results as they resolve
- [x] Season/Calendar Decider is its own stream per save, distinct from Club and Match Deciders
