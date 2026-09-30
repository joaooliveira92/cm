# 12: The Tactics screen

Type: prototype
Blocked by: 05, 06, 07, 18, 19
Status: claimed

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
Awaiting the human's verdict.
