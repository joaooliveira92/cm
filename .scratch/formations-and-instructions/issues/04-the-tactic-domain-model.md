# 04: The Tactic domain model

Type: grilling
Blocked by: 02, 03
Status: resolved

## Question

Define the distinct concepts and their boundaries, so a preset name like "4-4-2" never becomes
mutable tactical state:

- **Formation preset**: a named, immutable arrangement of slots. Does it also carry default
  instructions (CM's `.tac` files may), or only slots?
- **Slot**: a cell on the tactics grid, from the vocabulary
  [player-positional-model ticket 05](../../player-positional-model/issues/05-tactical-slot-vocabulary.md)
  settles. Does a slot carry separate with-ball and without-ball cells (ticket 02, item 5)?
- **Tactic**: formation shape + player assignments + team instructions + per-player instructions +
  bench. What of this is per-slot versus per-player (does an instruction follow the player when he
  moves slot, or stay with the slot)?
- **Saved Tactic**: what a library entry holds. Can it hold player assignments, or only the shape
  and instructions (players change between saves)?
- What happens to the name "4-4-2 (custom)" and to `isCustomShape` once presets are not the only
  source of a shape.
- Which concept the `ChangeTactics` command carries, and which the Expected Revision / Request Id
  protocol guards.

Glossary impact: rewrites **Formation**, **Tactic**, **Team Instructions**; adds **Formation
Preset**, **Player Instruction**, **Saved Tactic** (names to be settled); removes **Role**, **Role
Weights**, **Role Rating**.

## Answer

**A slot is a CM grid cell with an optional run target; Player Instructions belong to the slot;
built-in presets and saved tactics are one Tactic Template type with no players; the live Tactic is
a template's contents plus assignments and bench, named by its source template, with "modified" and
the row-count label derived; `ChangeTactics` carries the complete Tactic.** See
[Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).
