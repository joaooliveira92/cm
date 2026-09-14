# 07: Player Contract display

**What to build:** A contract detail panel or screen at `player/$playerId/contract` replacing the current WIP placeholder. Shows wage, length, expiry date, signing date, and club. Reads from `getPlayerContract` RPC (ticket 05).

Three view states: loading, ready, error. Can be a standalone route or a sub-section of the Player Profile — design choice left to implementation.

**Decisions:**

- Screen 56 (Player Contract) is in scope per ticket 04.

**Blocked by:** 05 (player read RPCs must exist first).

**Status:** resolved

## Answer

Player Contract screen implemented: replaces WIP placeholder at `player/$playerId/contract` with a real screen showing wage, length, signed date, and expiry date. Reads from `getPlayerContract` RPC via `playerContractAtom`. Three view states. Typecheck passes.