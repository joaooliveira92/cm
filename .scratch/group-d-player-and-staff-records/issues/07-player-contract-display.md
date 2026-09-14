# 07: Player Contract display

**What to build:** A contract detail panel or screen at `player/$playerId/contract` replacing the current WIP placeholder. Shows wage, length, expiry date, signing date, and club. Reads from `getPlayerContract` RPC (ticket 05).

Three view states: loading, ready, error. Can be a standalone route or a sub-section of the Player Profile — design choice left to implementation.

**Decisions:**

- Screen 56 (Player Contract) is in scope per ticket 04.

**Blocked by:** 05 (player read RPCs must exist first).

**Status:** ready-for-agent

- [ ] Contract display component reachable from player context
- [ ] Three view states (loading, ready, error)
- [ ] Shows: wage, length, expiry, signing date, club
- [ ] Unit tests
- [ ] `pnpm check:all` passes