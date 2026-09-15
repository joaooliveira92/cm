# 11: Player profile read fails for most players (unbound SQL in `career/player.ts`)

**What to build:** `getPlayerProfile` and `getPlayerContract` in `apps/desktop/src/main/career/player.ts` splice `playerId` into `sql.unsafe` text unquoted (`WHERE p.id = ${playerId}`), so SQLite rejects most player ids ("unrecognized token") and the renderer shows "The game returned an unexpected response". This breaks the Player Profile and Player Development screens, and is an injection pattern. The profile query also joins `player_fitness` without a Season filter, so after a concluded Season a player can match several ledger rows. Bind `playerId` as a parameter in all three queries and restrict the fitness join to the current Season, as `getSquad` does.

Found by ticket 08's e2e: the Player Development Centre's "Development" link opens Player Development, whose profile read fails.

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** claimed

- [ ] `getPlayerProfile` and `getPlayerContract` bind `playerId` as a parameter
- [ ] The profile's Condition and injury status come from the current Season's fitness row
- [ ] A main test reads every own-club player's profile through the RPC contract, and a hostile id returns `PlayerNotFoundError`
