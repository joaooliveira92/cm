# 21: The Tactic is stored and saved as CM's complete Tactic

**What to build:** A club's Tactic is persisted and edited as the complete model: `tactics` holds the
source template's name, the nine Team Instructions and the team set-piece instructions; `tactic_slots`
holds each slot's cell, run, Player Instructions and set-piece roles; an ordered table holds the taker
lists and captain. `ChangeTactics` carries the complete Tactic as one full replacement, still guarded
by Expected Revision and Request Id, and refuses an invalid Tactic with the rules' named problems.
Roles, Role Rating, Tempo, Pressing, `TACTICAL_STYLE_PRESETS` and the career-creation style picker are
removed; `preferred_formation` references one of the 29 templates and a new career's first Tactic
loads it; AI clubs' Tactics are built from their best XI in the new shape until ticket 32. The existing
Tactics screen and overview keep working, showing cells instead of Positions and dropping the Role
columns, pending the CM-layout screen. A transitional adapter feeds the existing three-phase engine
(Mentality mapped onto the attack/defence multipliers, everything else neutral) until ticket 26
replaces it. Every Role consumer in ticket 13's inventory gets its successor. The DDL change refuses
older saves.

Seam: the tactics command and read path in the main process and their IPC contracts. The command's
failure channel gains an invalid-Tactic error carrying the rules' problems; revision conflicts and
idempotent replays are unchanged.

**Decisions:**

- **Sibling effort; CM 03/04 as shipped is the source; Roles are removed; the engine stays non-spatial; complete Tactics change live; a named tactic library; AI runs complete Tactics; old saves are refused.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-roles-give-way-to-cm-player-instructions.md).
- **A slot is a CM grid cell with an optional run target; Player Instructions belong to the slot; built-in presets and saved tactics are one Tactic Template type with no players; the live Tactic is a template's contents plus assignments and bench, named by its source template, with "modified" and the row-count label derived; `ChangeTactics` carries the complete Tactic.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).
- **CM 03/04's nine team instructions, each defaulting to the game's unticked state, replace Mentality/Tempo/Pressing; Tactical Style presets are removed and the preferred formation is the manager's tactical identity.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-cm-team-instructions-replace-sliders-and-styles.md).

**Blocked by:** 20

**Status:** ready-for-agent

- [ ] Saving and re-reading a complete Tactic round-trips every field.
- [ ] An invalid Tactic is refused with its named problems; a stale revision is refused with the existing conflict; a replayed Request Id is a no-op.
- [ ] No Role, Role Rating, Tempo, Pressing or Tactical Style remains in packages or the app outside tests of their absence.
- [ ] A new career's first Tactic is the manager's preferred template; AI clubs field a valid new-model Tactic.
- [ ] Matches still simulate, deterministically, through the transitional adapter.
- [ ] An older save is refused with the schema-mismatch error; the commit says this DDL change refuses older saves.
- [ ] Typecheck, lint, effect-lint and the affected main, contracts and renderer tests pass.
