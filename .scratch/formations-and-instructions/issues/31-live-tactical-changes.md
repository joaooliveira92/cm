# 31: Live tactical changes

**What to build:** During a match the manager opens the same Tactics screen and changes anything:
formation, positions, runs, every instruction, set pieces and takers. Confirm queues the change for
the next unseen minute (or the break at half time), Undo Last removes the latest queued change, Cancel
discards them; substitutions at the same boundary apply first. The change is validated against the
revealed pitch.

Seam: the live command path (journaled `ChangeTactics`) and the in-match screen; the command's
failures are the invalid-Tactic error and the existing live-command refusals.

**Decisions:**

- **The Tactics screen follows CM 03/04's own layout (prototype variant A): File and View menus, Set Positions / Set Instructions / Set Priorities modes, a Team Selection list always on the left, CM's tick-box-plus-dropdown instruction rows, and the same screen in match with Confirm, Undo Last and Cancel.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-30-tactics-screen-follows-cm-0304-layout.md).
- **A slot is a CM grid cell with an optional run target; Player Instructions belong to the slot; built-in presets and saved tactics are one Tactic Template type with no players; the live Tactic is a template's contents plus assignments and bench, named by its source template, with "modified" and the row-count label derived; `ChangeTactics` carries the complete Tactic.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).

**Blocked by:** 23, 26

**Status:** ready-for-agent

- [ ] A confirmed change takes effect at M+1, and replay reproduces it.
- [ ] A change naming a sent-off player is refused.
- [ ] Undo Last and Cancel behave as CM's.
- [ ] Main match and renderer tests pass.
