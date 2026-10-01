# 01: Effort scope and binding decisions

Type: grilling
Blocked by: None (can start immediately)
Status: resolved

## Question

The v1 Tactic (five Formation templates, one FM-style Role per Position, three three-state Team
Instructions) was MVP-level. The user asked for a production-level, CM 03/04-faithful replacement
with no MVP compromises. Before charting, settle: how this relates to the existing
[player-positional-model](../../player-positional-model/map.md) effort, what source decides the
formation and instruction lists, whether Roles survive, how far the match engine changes, whether
complete Tactics change mid-match, whether managers get a tactic library, how far AI tactics go, and
whether old saves migrate.

## Answer

**Sibling effort; CM 03/04 as shipped is the source; Roles are removed; the engine stays
non-spatial; complete Tactics change live; a named tactic library; AI runs complete Tactics; old
saves are refused.** The Role removal is recorded in an Agent Note:
[Roles give way to CM 03/04 player instructions](../../../.agents/notes/implemented/architecture/2026-09-29-roles-give-way-to-cm-player-instructions.md).
The rest, each binding on later tickets:

- **Boundary.** This effort owns formation presets, team instructions, player instructions, live
  tactical changes, the saved tactic library, AI tactic selection and adjustment, the Tactics UI,
  persistence and validation of complete Tactics, and the reconciliation of docs that describe
  Roles. The slot vocabulary belongs to player-positional-model (its ticket 05) and is consumed,
  not duplicated. Presets using only existing slots proceed without waiting on it.
- **Source of truth.** CM 03/04 as shipped, confirmed by research into the default tactic files and
  the tactics and instruction screens. The pasted list that opened the effort is a hypothesis.
  Research is coordinated with player-positional-model ticket 01 so the same artifacts are not
  examined twice.
- **Engine.** The three-phase engine stays. Every setting gets an explicit, deterministic, tested
  effect in it. Spatial semantics are not faked: a setting with no phase-based meaning gets a
  documented approximation or no effect. A spatial engine is a separate future effort.
- **Live changes.** Formation, slot assignments, team instructions and every player instruction may
  change mid-match, taking effect at the next valid stoppage or tactical application boundary. Bench
  and substitution rules are unchanged.
- **Library.** Built-in presets stay. Managers create, name, update, duplicate, delete and
  quick-load custom tactics, each holding enough to reconstruct the complete tactical state.
- **AI.** AI clubs choose complete Tactics from squad capability and opponent characteristics and
  adjust them by score, minute, match state and available players, through the same public domain
  operations and validation as a human manager.
- **Saves.** No migration, matching player-positional-model's
  [ticket 02](../../player-positional-model/issues/02-does-this-effort-migrate-saves.md). The
  existing DDL-hashed `SAVE_SCHEMA_VERSION` already refuses an older save on open with
  `SaveSchemaMismatchError`, before any row is deserialized, so the "clear rejection" requirement
  needs no new mechanism, only a test that a pre-effort save is refused.
- **Guardrail.** Formation preset, slot, player assignment and instruction are distinct concepts. A
  Formation describes available slots; a Tactic combines a formation, assigned players, team
  instructions and per-player instructions. A preset name never becomes mutable tactical state.
