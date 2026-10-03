# 22: Tactics screen, CM layout: Team Selection and Set Positions

**What to build:** The Tactics editor becomes CM 03/04's screen, as approved from the prototype
(branch `prototype/tactics-screen`, variant A): the menu bar (File with quick load of built-in
templates, View with the Team Selection columns; Set Positions, Set Instructions and Set Priorities),
the Team Selection list (starters in slot order, substitutes, reserves; shirt number, name, Capt,
compact label, slot and fit tier, Condition), and Set Positions: the vertical pitch with the 31 cells,
numbered markers labelled "Surname, F", runs as dotted lines, moving the selected player to an empty
cell, setting or clearing his run, and swapping in a substitute. Every pointer action has a keyboard
equivalent. Saving goes through `ChangeTactics`.

Seam: the renderer against the contracts ticket 21 ships; no new main-side capability.

**Decisions:**

- **The Tactics screen follows CM 03/04's own layout (prototype variant A): File and View menus, Set Positions / Set Instructions / Set Priorities modes, a Team Selection list always on the left, CM's tick-box-plus-dropdown instruction rows, and the same screen in match with Confirm, Undo Last and Cancel.** See [Agent Note](../../../.agents/notes/implemented/feature/2026-09-30-tactics-screen-follows-cm-0304-layout.md).
- **A slot is a CM grid cell with an optional run target; Player Instructions belong to the slot; built-in presets and saved tactics are one Tactic Template type with no players; the live Tactic is a template's contents plus assignments and bench, named by its source template, with "modified" and the row-count label derived; `ChangeTactics` carries the complete Tactic.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).

**Blocked by:** 21

**Status:** resolved

- [x] The screen renders the menu bar, the Team Selection list and the pitch for a seeded Tactic.
- [x] Moving a player, setting a run, and swapping a substitute each change the draft and save through `ChangeTactics`.
- [x] Every one of those actions is reachable and completable by keyboard.
- [x] Fit shows as a tier word in the list and a non-colour marker on the pitch; no raw positional rating appears.
- [x] Renderer tests for the screen pass, and typecheck and lint pass.
