Type: task
Status: resolved
Blocked by: 03

# 04: Wire Player Development into SeasonConcluded

**What to build:** make the shared math actually run at the season boundary. When a season concludes
(via the existing `advanceCalendar` → `SeasonConcluded` transition), every player on every club
develops: their stored Attributes are updated to the next-season set from the shared math, and a new
`PlayerDeveloped` event (carrying the updated Attribute set) is appended to that club's event stream,
per club. Adds the `PlayerDeveloped` event payload schema and its round-trip test. This makes the game
non-static: a player's Attributes now change across a season.

**Blocked by:** 03.

**Status:** ready-for-agent

- [x] Folding `SeasonConcluded` develops every player on every club once, writing the new Attribute
      values to storage.
- [x] One `PlayerDeveloped` event is appended per club, carrying that club's updated Attribute set, on
      the club stream — in the same transaction as the development write.
- [x] No-focus development at this stage is unmodified Player Development (Training Focus application
      is a later ticket).
- [x] The `PlayerDeveloped` event schema round-trips (`packages/contracts`).
- [x] Verified end-to-end following the `apps/desktop/test/aiClubs.test.ts` pattern: drive
      `advanceCalendar`, assert every player's stored Attributes advanced and `PlayerDeveloped` fired
      per club.

## Comments

- Published from the approved `to-tickets` breakdown (spec: `.scratch/training/spec.md`).
- Implemented in commit `5e39c4a` ("Implement Player Development & Training Focus (tickets 03-05)").