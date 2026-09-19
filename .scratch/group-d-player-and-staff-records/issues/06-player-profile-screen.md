# 06: Player Profile screen

**What to build:** A dedicated player profile screen replacing the current WIP placeholder at `player/$playerId/profile`. Shows the player's identity, attributes overview, positions, current club context, contract summary, and injury status. Reads from `getPlayerProfile` RPC (ticket 05).

Three view states: loading, ready, error. Accessible from any player row (squad table, league table, transfers table, competition squad).

The screen is read-only — no commands, no mutations.

**Decisions:**

- Screen 50 (Player Profile) is in scope per ticket 04.

**Blocked by:** 05 (player read RPCs must exist first).

**Status:** resolved

## Answer

Player Profile screen implemented: replaces WIP placeholder at `player/$playerId/profile` with a real screen showing identity, positions, top attributes per category, club, contract info, and injury status. Reads from `getPlayerProfile` RPC via `playerProfileAtom`. Three view states (Initial → loading message, Failure → error message, Success → profile content).

Typecheck passes.