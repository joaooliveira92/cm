# 14 — Absence: Screens 14, 15, 16, 17 (management screens)

Type: task
Status: resolved
Assignee: joao
Blocked by: 03

## Question

Four imported specs describe management-related screens with no route or component:

- **Screen 14: Save Game and Save As** — `14_save_game_and_save_as.md`, 71 sections. Contradicted by design: `CONTEXT.md` **Save** = "durable at commit… there is no save action for the player to invoke."
- **Screen 15: Delete Saved Game** — `15_delete_saved_game.md`, 59 sections. No delete-save button, no RPC, no route. The only deletion is background provisional-world cleanup.
- **Screen 16: Game Preferences** — `16_game_preferences.md`, 82 sections. No preferences route/screen/dialog. The only preference-like persistence is Squad table column preferences (localStorage) and keybinding overrides (JSON file).
- **Screen 17: Display and Sound Options** — `17_display_and_sound_options.md`, 68 sections. No display/sound/accessibility options UI. Fixed 1200×800 window, no display capability inspection.

All four carry blanket-trim rows in the ledger already. This ticket scans the surviving sections, distributes them across `out-of-scope` / `contradicted` / `deferred`, registers survivors, and flips the cluster to `Reviewed`.

## Done when

All four screens have a `Reviewed` status in `RECONCILIATION.md`, each with rows for every section the implementation does not follow, and no `unscheduled` rows remain.

## Answer

**All four management screens fully absent — every surviving section classified `contradicted`, registered in the ledger, Coverage table and screen statuses flipped to `Reviewed`.**

- **Screen 14** (42 surviving sections after blanket-trim removal of cloud/multiplayer/scaffolding): no Save Game or Save As concept exists. The only write path is boot-scene continuation that auto-saves at commit. All survivors classified `contradicted` against [Save](../../../CONTEXT.md) — "durable at commit… there is no save action for the player to invoke."
- **Screen 15** (45+ surviving sections after blanket-trim removal of cloud/multiplayer/scaffolding): no delete-save UI, RPC, or route exists. The only deletion is background provisional-world cleanup (delete-on-cancel of uncommitted career creation), which has no user-facing screen. All survivors classified `contradicted`.
- **Screen 16** (~60 surviving sections after blanket-trim removal of cloud/multiplayer/telemetry/resource-policy): no preferences screen, route, dialog, or persistence layer exists. The only preference-like persistence is Squad table column preferences (localStorage) and keybinding overrides (JSON file), neither surfaced through a preferences UI. All survivors classified `contradicted`.
- **Screen 17** (~64 surviving sections — the least-trimmed spec in Group A, losing only three sections to blanket trim): no display/sound/accessibility options screen, route, or dialog exists. The application opens a fixed 1200×800 BrowserWindow with no display-capability inspection, no audio system, and no options UI. All survivors classified `contradicted`.
- No `deferred` rows on any screen: none of the four concepts (user-invoked save, delete, preferences, display/sound options) exist in the codebase, so no section is merely "wanted and not built" — every section is contradicted by the codebase's current architecture.
- No fog surfaced: the answer clears no new territory toward the destination beyond what the blanket trim (ticket 03) already revealed.
- No Agent Note written: pure audit application of existing architectural decisions; no new choice asserted.