# 10: The saved tactic library

Type: grilling
Blocked by: 02, 04
Status: resolved

## Question

Decide the library's scope and behaviour: owned by the manager (follows him between clubs) or by
the club save; a cap on entries; how built-in presets appear next to custom entries; what quick
load does to the current Tactic (a Tactic Template holds no players, per ticket 04) (replace shape and instructions, and how players are re-seated into
the new slots when the shape changes); name uniqueness; and whether create, update, duplicate and
delete go through the same revision and idempotency protocol as a Tactic save.

## Answer

**In the save, owned by the manager; quick load keeps players by slot number and leaves the bench;
create/rename/overwrite/duplicate/delete with read-only built-ins, unique case-insensitive names, no
cap, Request Id on every operation and Expected Revision on overwrite/rename/delete.** See
[Agent Note](../../../.agents/notes/implemented/feature/2026-09-29-tactic-library-in-the-save-reseats-by-slot.md).
