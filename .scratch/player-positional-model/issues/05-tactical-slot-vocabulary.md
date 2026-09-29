# 05: The tactical slot vocabulary

Type: grilling
Blocked by: 01, 03

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
