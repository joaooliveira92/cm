# Agent Note: A Tactic is a Tactic Template plus players, on CM's grid of cells

Status: proposed

## Problem

The v1 Tactic stored a Formation name from five templates, one Position and one Role per slot, and
three Team Instructions. Rebuilding it to Championship Manager 03/04 fidelity needs a domain model
that separates the things CM kept apart: the named shape a manager loads, the cells players stand
in, where each one runs, the instructions, and the players themselves. Without a decision, a preset
name such as "4-4-2" tends to become mutable state on the club's Tactic, and built-in presets and
manager-saved tactics grow into two parallel types.

## Proposal

- **Slot.** A slot will be a cell on CM 03/04's tactics grid: the goalkeeper cell, plus six outfield
  rows (SW, D, DM, M, AM, F) by five columns (L, LC, C, RC, R). Two centre-backs are distinct cells
  (`D LC`, `D RC`), not two copies of one Position. The row and column vocabulary is owned by the
  player-positional-model effort's slot-vocabulary ticket; this note fixes only that a slot is a
  cell.
- **Run.** Each slot may carry one run target cell, CM's arrow. It is stored as data. Its effect on
  the non-spatial engine is decided separately and must never pretend to simulate movement.
- **Instructions belong to the slot.** Per-player instructions are stored per slot, as CM's tactic
  files store them. A player moved to another slot takes that slot's instructions.
- **Tactic Template.** Built-in presets and manager-saved tactics will be one type: eleven slots with
  their runs and per-slot Player Instructions, plus the Team Instructions, and no players. A built-in
  template is read-only; a saved one belongs to the manager. "Preset" is a UI label, not a domain
  term.
- **Tactic.** The club's live value is a template's contents plus a player assigned to each slot and
  the bench. It stores the name of the template it came from. Whether it has been modified since, and
  its row-count label (D-DM-M-AM-F counts), are always derived, never stored.
- **Formation.** The arrangement of the eleven slots and their runs, the structural part of a
  template or Tactic.
- **One save command.** `ChangeTactics` carries the complete Tactic as a full replacement, still
  guarded by Expected Revision and Request Id. There is no per-field command.

## Why the preset name is not the shape

CM's preset names do not follow row counts: "4-4-2 Attacking" is two M and two AM cells, which a
row count calls 4-2-2-2, and "5-3-2" puts its wing-backs in DM cells. A name is therefore an
identity of the template a Tactic came from, and the shape label is computed from the cells.

## Relationship to existing notes

Supersedes in part the "Formation" section of
[Role Rating is computed at tactic-resolution time](../../implemented/architecture/2026-08-27-role-rating-outside-match-engine.md)
only if the engine-mapping ticket gives runs or cells an effect beyond selecting which ratings feed
each phase; until then that section stands. Complements
[Roles give way to CM 03/04 player instructions](2026-09-29-roles-give-way-to-cm-player-instructions.md).

## Alternatives considered

- **Keep Positions as slots (DC, MC, ...).** Rejected: it cannot tell two centre-backs apart, cannot
  express CM's LC/RC columns or wide DM and AM cells, and cannot hold a run target.
- **Instructions per player.** Rejected: CM's tactic files contain no players, so templates could
  not carry instructions, and loading a template onto a new squad would need a player-matching rule.
- **Separate Preset and Saved Tactic types.** Rejected: identical contents; the only differences are
  ownership and write access.
- **Store the preset name as the Tactic's formation.** Rejected: that is the mutable-preset-name
  problem this note exists to prevent.

## Acceptance criteria

- The Tactic, Tactic Template, Formation, Slot, Run, Team Instruction and Player Instruction terms
  exist in `CONTEXT.md` when the code ships, and Role does not.
- Built-in and saved templates share one schema and one validation path.
- A Tactic's modified marker and row-count label are functions of its slots, with no stored column.
- `ChangeTactics` has exactly one payload shape: the complete Tactic.

## Risks

- Every existing Position consumer that reads a slot must move to cells; the inventory lives in the
  player-positional-model effort.
- A full-replacement command sends more data per save than a per-field one. Accepted: a Tactic is
  small, and full replacement keeps revision conflicts simple.
