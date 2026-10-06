# Sweeper is centre-only

Type: task
Status: resolved

## Question

The tactics grid has five sweeper cells (SW L, LC, C, RC, R). A back four dragged deep reads as three
or four sweepers, which no tactic means. Reduce the sweeper row to SW C: the grid becomes 27 cells, the
server refuses the other four, a drop deep on any column but the centre is D in that column, and the
dragged marker names the cell it would land in, so a boundary crossing is visible before the drop.

Saves are disposable during development, so the new DDL check refuses older saves; no migration.

## Answer

Done. `Slot` pins SW to `C` as it pins GK (`SWEEPER_SLOT`, `isSlot`); `SLOTS` is 27 cells;
`validateTactic`, `CellSchema` and two new DB checks per slot table (cell and run target) refuse any
other sweeper cell. The DDL change refuses saves made before it, per the disposable-saves note. On the
pitch the D cell runs back to the keeper's end on every column but C, and a dragged marker names the
cell it would land in and the fit there.
