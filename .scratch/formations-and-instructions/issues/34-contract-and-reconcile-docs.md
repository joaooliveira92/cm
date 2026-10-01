# 34: Contract: delete the transitional pieces and reconcile the docs

**What to build:** No code reads the `Position` type, the Position-to-cell mappings or any remaining
transitional adapter, so they are deleted. `CONTEXT.md` gains Tactic Template, Formation, Run, Player
Instruction, Set-Piece Role and Taker List, loses Role, Role Weights and Role Rating, and rewrites
Tactic and Team Instructions. Notes this effort supersedes in part (the three-phase match engine,
Role Rating outside the engine, set pieces as a Tactic field, manager style and appearance) get their
blocks; this effort's proposed notes move to `implemented/`.

Seam: a deletion with no behaviour change.

**Decisions:**

- **Sibling effort; CM 03/04 as shipped is the source; Roles are removed; the engine stays non-spatial; complete Tactics change live; a named tactic library; AI runs complete Tactics; old saves are refused.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-roles-give-way-to-cm-player-instructions.md).
- **A slot is a CM grid cell with an optional run target; Player Instructions belong to the slot; built-in presets and saved tactics are one Tactic Template type with no players; the live Tactic is a template's contents plus assignments and bench, named by its source template, with "modified" and the row-count label derived; `ChangeTactics` carries the complete Tactic.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).

**Blocked by:** 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, and player-positional-model 19

**Status:** resolved

- [x] No source file references `Position`, Role, Tempo, Pressing or Tactical Style.
- [x] `CONTEXT.md` defines the new terms and none of the removed ones.
- [x] Superseded notes carry their blocks; this effort's notes are under `implemented/`.
- [x] The full gate and the e2e suite pass.
