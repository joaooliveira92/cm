# 25: The Tactic library

**What to build:** The manager saves the current Tactic as a named Tactic Template, and renames,
overwrites, duplicates and deletes saved ones; built-in templates are read-only and can only be
duplicated. Quick load (File menu) replaces the Tactic's slots, runs and instructions from any
template and keeps each player in his slot number and the bench unchanged. The library is stored in
the save, belongs to the manager and follows him between clubs.

Seam: new library commands in the main process, each carrying a Request Id, with overwrite, rename and
delete also carrying a per-template Expected Revision; failures a caller observes: a duplicate name, a
built-in template targeted by a write, a stale revision, an unknown template.

**Decisions:**

- **In the save, owned by the manager; quick load keeps players by slot number and leaves the bench; create/rename/overwrite/duplicate/delete with read-only built-ins, unique case-insensitive names, no cap, Request Id on every operation and Expected Revision on overwrite/rename/delete.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-tactic-library-in-the-save-reseats-by-slot.md).
- **A slot is a CM grid cell with an optional run target; Player Instructions belong to the slot; built-in presets and saved tactics are one Tactic Template type with no players; the live Tactic is a template's contents plus assignments and bench, named by its source template, with "modified" and the row-count label derived; `ChangeTactics` carries the complete Tactic.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).

**Blocked by:** 21

**Status:** ready-for-agent

- [ ] Every operation round-trips and a replayed Request Id is a no-op.
- [ ] A duplicate name (case-insensitive), a write to a built-in, and a stale revision are refused with typed errors.
- [ ] Quick loading onto a full Tactic keeps every player's slot number and the bench.
- [ ] The library survives save and load and follows the manager to a new club.
- [ ] Main, contracts and renderer tests pass.
