# 19 — Screen 13: Load Saved Game (complement)

Type: task
Status: open
Blocked by: 03

## Question

Screen 13 (`13_load_saved_game.md`, 77 sections, 2,174 lines) describes a saved-game browser with details panel, filters, sort, preview, location badges, and cloud sync indicators. The implementation is `saveList.tsx` (79 lines) — a bare-name button list with "Continue career" (`handleContinue`, lines 34–38) and backend `loadSave` in `main/saves.ts`.

This is a **complement** to the shell audit (ticket 04). Ticket 04 already read `saveList.tsx` and produced rows for Screen 1's sections touching the same file (entry point, keyboard tier, swallowed failure, actions registry gap). This ticket records only what Screen 13's spec demands that the shell audit didn't already cover: the absent surface (details panel, filters, sort, preview, location badges, save-type presentation, corrupt-save marking, acquisition retry, stale-entry handling).

The cloud and multiplayer sections were trimmed by ticket 03; this audit confirms the disposition. The Save List's keyboard tier is owned by ticket 09 (which the shell audit absorbed into).

## Done when

Screen 13 has a `Reviewed` status in `RECONCILIATION.md` with rows for every section the implementation does not follow, and no `unscheduled` rows remain. No row duplicates a row already in Screen 1's section of the ledger.