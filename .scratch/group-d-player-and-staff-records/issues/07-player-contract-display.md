# 07: Player Contract display

**What to build:** A contract detail panel or screen at `player/$playerId/contract` replacing the current WIP placeholder. Shows wage, length, expiry date, signing date, and club. Reads from `getPlayerContract` RPC (ticket 05).

Three view states: loading, ready, error. Can be a standalone route or a sub-section of the Player Profile — design choice left to implementation.

**Decisions:**

- Screen 56 (Player Contract) is in scope per ticket 04.

**Blocked by:** 05 (player read RPCs must exist first).

**Status:** resolved

## Answer

Player Contract screen implemented: replaces WIP placeholder at `player/$playerId/contract` with a real screen showing wage, length, signed date, and expiry date. Reads from `getPlayerContract` RPC via `playerContractAtom`. Three view states. Typecheck passes.
## Follow-up — 2026-09-20

Rebuilt as CM 03/04's **Information** tab rather than a standalone contract page: Overview (age,
place of birth, nationality, club, value, Overall Rating) beside Contract Details (wages, length,
started, expires). Happiness, CM's third panel here, has no counterpart — no morale system is
modelled (ticket 03).

The route path and screen id stay `contract`; only the tab label is "Information". Renaming the
path would touch the router, the destinations union, the nav adapter and the keyboard spine for a
word that matters in one place.
