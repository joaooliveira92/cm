# 05: The tactical slot vocabulary

Type: grilling
Blocked by: 01, 03
Status: resolved

## Question

A formation's slot and a player's positional rating are separate concepts that today share one
ten-value `Position` type. Decide the slot vocabulary a Tactic uses:

- Which slots exist: whether SW, WB (left and right), wide DM (DML, DMR), wide AM (AML, AMR), and
  a separate forward and striker centre are placeable, given the line set ticket 01 found.
- Whether a slot is named by the same codes a player's label uses, or by its own type.
- What each new slot carries in the game-design tables: its Position Weights, its one v1 Role
  (`POSITION_ROLES` is total over the slot type), and its Phase (`PHASE_POSITIONS`). A wing-back or a
  wide DM straddles two phases today; say which one it feeds.
- Whether the five v1 Formation templates change, or only the set of slots a custom shape may use.

Glossary impact: the **Formation**, **Role** and **Phase Strength** entries name the current slot
set.

## Input from formations-and-instructions (2026-09-29)

That effort's [Tactic domain model](../../formations-and-instructions/issues/04-the-tactic-domain-model.md)
decided that a Tactic's slot is a cell on CM 03/04's tactics grid: GK plus six outfield rows (SW, D,
DM, M, AM, F) by five columns (L, LC, C, RC, R), with no wing-back row, verified from the shipped
tactic files in
[the formations research](../../../docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md).
This ticket still owns the names and codes of those rows and columns and what each cell carries in
the game-design tables. It no longer needs to decide whether SW, wide DM, wide AM and wide F cells
are placeable: CM's presets use all of them.

## Answer

**A slot is its own (row, column) type: rows GK, SW, D, DM, M, AM, F and columns L, LC, C, RC, R;
Position Weights keyed by row and width (twelve tables, four new); phase by row.** Roles no longer
exist, so no slot carries one, and the v1 templates are replaced by the 29 CM presets
(formations-and-instructions ticket 05). See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slots-are-row-column-cells-weighted-by-row-and-width.md).
