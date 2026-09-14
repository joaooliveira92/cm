# 06: Player Profile screen

**What to build:** A dedicated player profile screen replacing the current WIP placeholder at `player/$playerId/profile`. Shows the player's identity, attributes overview, positions, current club context, contract summary, and injury status. Reads from `getPlayerProfile` RPC (ticket 05).

Three view states: loading, ready, error. Accessible from any player row (squad table, league table, transfers table, competition squad).

The screen is read-only — no commands, no mutations.

**Decisions:**

- Screen 50 (Player Profile) is in scope per ticket 04.

**Blocked by:** 05 (player read RPCs must exist first).

**Status:** ready-for-agent

- [ ] `PlayerProfileScreen` component at `player/$playerId/profile` route
- [ ] Three view states (loading, ready, error)
- [ ] Shows: name, age, nationality, positions + familiarity, attribute summary, club, contract expiry, Overall Rating, Transfer Value, injury status
- [ ] Accessible from squad/player row navigation
- [ ] Unit tests for view states and key content
- [ ] `pnpm check:all` passes