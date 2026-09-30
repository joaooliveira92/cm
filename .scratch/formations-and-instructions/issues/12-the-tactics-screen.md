# 12: The Tactics screen

Type: prototype
Blocked by: 05, 06, 07, 18, 19
Status: resolved

## Question

How should the Tactics screen look and behave with the full model: the slot grid (including any new
slots), preset quick load and the saved library, team instructions, a per-player instruction panel,
and the live in-match version of the same screen. Build a rough prototype to react to. Coordinate
with the parallel Tactics UI work in the worktree (`TeamSelectionGrid.tsx`, `formationTable.ts`,
`NumberChip.tsx`, uncommitted on 2026-09-29) so this does not redesign a screen mid-change.

## Prototype

Four variants on branch `prototype/tactics-screen` (8212726f), also present uncommitted in the dev
worktree while under review: A CM classic, B tabbed workspace, C slot spreadsheet, D live match. On
stub data (CM 03/04's 29 presets, a fake squad), mounted on the Tactics editor route behind
`?variant=` in development builds only; a "Tactics prototype →" button on the live editor opens it.
Variant A was rebuilt on CM 03/04 screenshots the human supplied (fb5a1e1b) and approved on
2026-09-30; the prototype was removed from dev and stays on the branch.

## Answer

**The Tactics screen follows CM 03/04's own layout (prototype variant A): File and View menus, Set
Positions / Set Instructions / Set Priorities modes, a Team Selection list always on the left, CM's
tick-box-plus-dropdown instruction rows, and the same screen in match with Confirm, Undo Last and
Cancel.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-30-tactics-screen-follows-cm-0304-layout.md).
