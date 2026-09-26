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
## Follow-up — 2026-09-20

The screen shipped; the entry point in this ticket's own scope line ("accessible from any player
row") did not. Until now the only way to reach `player/$playerId/profile` was the Team Scout
Report's key-player list or typing the URL — from the Squad screen, a player's name toggled a row
highlight and nothing else.

Closed now: in both Squad layouts the name button's click, and the row's primary action (Enter),
open that player's Profile. Selection moved to Space alone. The three player routes were also
folded into one shared frame (header + tab strip) and the Profile body rebuilt as CM 03/04's
per-Category Attribute columns. See
[the Agent Note](../../../.agents/notes/implemented/feature/2026-09-20-the-player-name-is-the-way-into-the-player-screen.md).

Still not wired, and deliberately: the league table, the transfer market and competition squad
rows. The market's row selection feeds its bid form, so its identity cell cannot navigate without
a separate affordance — a ticket of its own if it is wanted.
