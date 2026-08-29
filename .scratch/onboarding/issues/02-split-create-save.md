# 02: Split `createSave` into `beginCareer` / `commitCareer` / `discardCareer` + lift `initializeSeasonEconomy`

**What to build:** Refactor the monolithic `createSave` into three explicit lifecycle operations. `beginCareer` creates a provisional database (schema + full neutral world + season economy) but no `save_meta` row, so the save is invisible to `listSaves`. `commitCareer` atomically writes the manager profile, human club assignment, Board Objective, `manager_status`, AI Tactics, season start, and `save_meta` — making the career visible only after successful commitment. `discardCareer` is an idempotent cleanup that deletes the provisional file. Lift `initializeSeasonEconomy` out of `startSeason` so budgets are persisted and readable before club selection.

**Decisions:**

- `createSave` splits into `beginCareer` (schema, generation, season economy, no `save_meta`) and `commitCareer` (manager profile, human club, Board Objective, `manager_status`, AI Tactics, season start, `save_meta` — one transaction). See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md).
- `discardCareer` is idempotent: if the file exists, delete it; if absent, succeed; if deletion fails, the save remains invisible (no `save_meta`). See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md).
- `initializeSeasonEconomy` lifted out of `startSeason` and runs immediately after world generation, before selection, because it has no user-club dependency. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-club-selection-at-new-game.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `beginCareer(savesDir, name?)` creates provisional SQLite file with full schema + `generateWorld` + `initializeSeasonEconomy`, returns provisional id + generated club summaries; no `save_meta` row written
- [ ] `commitCareer(provisionalId, managerName, archetypeOrigin, pillarDistribution, selectedClubId)` atomically validates and writes: `manager_profile`, human club assignment, Board Objective, `manager_status`, AI Tactics, season start, `save_meta`
- [ ] `discardCareer(provisionalId)` is idempotent, deletes the database file if it exists
- [ ] `initializeSeasonEconomy` lifted before selection, call site in `startSeason` removed; the operation is verified to have no user-club dependency
- [ ] `commitCareer` failure aborts creation; no visible save can exist without exactly one `manager_profile` row
- [ ] Tests: provisional save invisible to `listSaves`; `commitCareer` produces valid career; `discardCareer` idempotent; economy data readable before club selection
- [ ] `createSave` either deleted or kept as a thin compat shim (product is unreleased, so deletion is safe)